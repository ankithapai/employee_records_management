# main flask application
from flask import Flask, request, jsonify
from flask_cors import CORS
from elasticsearch import Elasticsearch, warnings
import uuid
import csv
from io import StringIO
from flask import Response

app = Flask(__name__)
CORS(app)

# Elasticsearch Configuration
es = Elasticsearch(['https://localhost:9200'], 
    basic_auth=("elastic", "fdY6C6DGt9-li=aPlJSZ"),
    verify_certs=False)
INDEX_NAME = 'employee_records'

def create_employee_index():
    """Create index with custom mapping"""
    index_mapping = {
        "settings": {
            "analysis": {
                "analyzer": {
                    "partial_match_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "edge_ngram"]
                    }
                },
                "filter": {
                    "edge_ngram": {
                        "type": "edge_ngram",
                        "min_gram": 2,
                        "max_gram": 10
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "employee_id": { "type": "keyword" },
                "first_name": { 
                    "type": "text", 
                    "fields": { 
                        "keyword": { "type": "keyword" },
                        "suggest": {  
                            "type": "text",
                            "analyzer": "partial_match_analyzer"
                        }
                    } 
                },
                "last_name": { 
                    "type": "text", 
                    "fields": { 
                        "keyword": { "type": "keyword" },
                        "suggest": { 
                            "type": "text",
                            "analyzer": "partial_match_analyzer"
                        }
                    } 
                },
                "email": { "type": "keyword" },
                "department": { "type": "keyword" },
                "position": { "type": "text" },
                "salary": { "type": "float" },
            }
        }
    }
    
    if not es.indices.exists(index=INDEX_NAME):
        es.indices.create(index=INDEX_NAME, body=index_mapping)
        print(f"Created index: {INDEX_NAME}")

# Create index on startup
create_employee_index()

@app.route('/')
def home():
    """Welcome route for the base URL"""
    return jsonify({
        "message": "Welcome to the Employee Management API!",
        "endpoints": {
            "create_employee": "POST /employees",
            "get_employees": "GET /employees",
            "get_employee_by_id": "GET /employees/<employee_id>",
            "update_employee": "PUT /employees/<employee_id>",
            "delete_employee": "DELETE /employees/<employee_id>"
        }
    })


# CRUD Routes 
@app.route('/employees', methods=['POST'])
def create_employee():
    """Create a new employee record"""
    employee_data = request.json
    employee_id = str(uuid.uuid4())  # Generate unique ID
    employee_data['employee_id'] = employee_id

    # Add suggest fields for first_name and last_name
    employee_data['first_name_suggest'] = {"input": employee_data['first_name']}
    employee_data['last_name_suggest'] = {"input": employee_data['last_name']}

    # Ensure first_name and last_name remain as plain text
    es.index(index=INDEX_NAME, id=employee_id, body={
        "first_name": employee_data['first_name'],
        "last_name": employee_data['last_name'],
        "email": employee_data['email'],
        "department": employee_data['department'],
        "position": employee_data['position'],
        "salary": employee_data['salary'],
        "first_name_suggest": employee_data['first_name_suggest'],
        "last_name_suggest": employee_data['last_name_suggest'],
        "employee_id": employee_id,
    })
    return jsonify({"status": "success", "employee_id": employee_id})


@app.route('/employees', methods=['GET'])
def search_employees():
    """Search and filter employees"""
    query_params = {
        "query": {
            "bool": {
                "must": []
            }
        },
        "size": 5,
        "from": 0
    }
    
    # Pagination parameters
    size = int(request.args.get('size', 5))  # Results per page
    page = int(request.args.get('page', 1))  # Page number
    query_params["size"] = size
    query_params["from"] = (page - 1) * size

    # Optional filtering
    if request.args.get('department'):
        query_params["query"]["bool"]["must"].append({
            "term": {"department": request.args.get('department')}
        })
    
    if request.args.get('search'):
        search_term = request.args.get('search')
        query_params["query"]["bool"]["must"].append({
            "multi_match": {
                "query": search_term,
                "type": "bool_prefix",
                "fields": [
                    "first_name^3", 
                    "first_name.suggest^2",
                    "last_name^3", 
                    "last_name.suggest^2",
                    "email", 
                    "position",
                    "skills"
                ],
                "fuzziness": "AUTO",
                "operator": "OR",  # This allows partial matching
            }
        })
    
    # Sorting as per first_name by default
    sort_by = request.args.get('sort', 'first_name.keyword')
    sort_order = request.args.get('order', 'asc')
    query_params["sort"] = [{sort_by: {"order": sort_order}}]
    
    try:
        results = es.search(index=INDEX_NAME, body=query_params)
        total_hits = results['hits']['total']['value']  # Total number of hits
        employees = [
            {**hit['_source'], '_id': hit['_id']} 
            for hit in results['hits']['hits']
        ]
        return jsonify({"employees": employees, "total": total_hits})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/employees/<employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Get specific employee by ID"""
    try:
        result = es.get(index=INDEX_NAME, id=employee_id)
        return jsonify(result['_source'])
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Update employee record"""
    try:
        update_data = request.json
        es.update(index=INDEX_NAME, id=employee_id, body={"doc": update_data})

        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Delete employee record"""
    es.delete(index=INDEX_NAME, id=employee_id)
    return jsonify({"status": "success"})

# Auto-suggest Routes
@app.route('/employees/suggest', methods=['GET'])
def suggest_employees():
    """Provide autocomplete suggestions"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    
    # Create a search body for suggestions
    body = {
        "query": {
            "bool": {
                "should": [
                    {
                        "multi_match": {
                            "query": query,
                            "type": "bool_prefix",
                            "fields": [
                                "first_name.suggest^3",
                                "last_name.suggest^3",
                            ]
                        }
                    }
                ]
            }
        },
        "size": 10,
        "_source": ["first_name", "last_name"]
    }

    try:
        results = es.search(index=INDEX_NAME, body=body)
        
        # Transform results into suggestions
        suggestions = [
            {
                "text": f"{hit['_source'].get('first_name', '')} {hit['_source'].get('last_name', '')}".strip(),
                "first_name": hit['_source'].get('first_name', ''),
                "last_name": hit['_source'].get('last_name', '')
            } 
            for hit in results['hits']['hits']
        ]
        
        return jsonify(suggestions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(Exception)
def handle_exception(e):
    response = {"error": str(e)}
    return jsonify(response), 500

@app.route('/employees/export', methods=['GET'])
def export_employees():
    """Export employees as a CSV file"""
    query_params = {
        "query": {"match_all": {}},  # Fetch all employees
        "size": 10000  # Adjust this if you have a large dataset
    }

    try:
        results = es.search(index=INDEX_NAME, body=query_params)
        employees = [
            {
                "employee_id": hit["_source"].get("employee_id", ""),
                "first_name": hit["_source"].get("first_name", ""),
                "last_name": hit["_source"].get("last_name", ""),
                "email": hit["_source"].get("email", ""),
                "department": hit["_source"].get("department", ""),
                "position": hit["_source"].get("position", ""),
                "salary": hit["_source"].get("salary", ""),
            }
            for hit in results["hits"]["hits"]
        ]

        # Create a CSV in memory
        csv_output = StringIO()
        writer = csv.DictWriter(csv_output, fieldnames=[
            "employee_id", "first_name", "last_name", "email", "department", "position", "salary"
        ])
        writer.writeheader()
        writer.writerows(employees)

        # Return CSV as a response
        return Response(
            csv_output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=employees.csv"}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)