# main flask application
from flask import Flask, request, jsonify
from flask_cors import CORS
from elasticsearch import Elasticsearch, warnings
import uuid

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
        "mappings": {
            "properties": {
                "employee_id": {"type": "keyword"},
                "first_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                "last_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                "email": {"type": "keyword"},
                "department": {"type": "keyword"},
                "position": {"type": "text"},
                "hire_date": {"type": "date"},
                "salary": {"type": "float"},
                "skills": {"type": "keyword"},
                "contact_number": {"type": "keyword"}
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
    
    es.index(index=INDEX_NAME, id=employee_id, body=employee_data)
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
        "size": 100
    }
    
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
                "fields": ["first_name", "last_name", "email", "position"]
            }
        })
    
    results = es.search(index=INDEX_NAME, body=query_params)
    return jsonify([
        {**hit['_source'], '_id': hit['_id']} 
        for hit in results['hits']['hits']
    ])

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

@app.errorhandler(Exception)
def handle_exception(e):
    response = {"error": str(e)}
    return jsonify(response), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)