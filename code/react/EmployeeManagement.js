import React, { useState, useEffect } from 'react';
import './App.css';

function EmployeeManagement() {
    const [employees, setEmployees] = useState([]);
    const [currentEmployee, setCurrentEmployee] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        position: '',
        salary: '',
        skills: [],
        contact_number: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Fetch employees with search and filter
    const fetchEmployees = async () => {
        try {
            const params = new URLSearchParams({
                search: searchTerm,
                department: selectedDepartment
            });
            const response = await fetch(`http://localhost:5000/employees?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    // Read Single Employee
    const fetchSingleEmployee = async (employeeId) => {
        try {
            const response = await fetch(`http://localhost:5000/employees/${employeeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            setCurrentEmployee(data);
            setIsEditing(true);
        } catch (error) {
            console.error('Error fetching employee:', error);
        }
    };

    // Create/Update Employee
    const saveEmployee = async (e) => {
        e.preventDefault();
        try {
            const url = isEditing
                ? `http://localhost:5000/employees/${currentEmployee._id}`
                : 'http://localhost:5000/employees';

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentEmployee)
            });

            if (response.ok) {
                fetchEmployees();
                resetForm();
            }
        } catch (error) {
            console.error('Error saving employee:', error);
        }
    };

    // Delete Employee
    const deleteEmployee = async (employeeId) => {
        try {
            const response = await fetch(`http://localhost:5000/employees/${employeeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                fetchEmployees();
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
        }
    };

    // Update employee
    const updateEmployee = async (employeeId, updatedData) => {
        const response = await fetch(`http://localhost:5000/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });

        const result = await response.json();
        console.log(result);
    };


    // Reset Form
    const resetForm = () => {
        setCurrentEmployee({
            first_name: '',
            last_name: '',
            email: '',
            department: '',
            position: '',
            salary: '',
            skills: [],
            contact_number: ''
        });
        setIsEditing(false);
    };

    // Initial fetch
    useEffect(() => {
        fetchEmployees();
    }, [searchTerm, selectedDepartment]);

    return (
        <div className="container">
            <h1>Employee Management</h1>

            {/* Search and Filter Section */}
            <div className="search-filter">
                <input
                    type="text"
                    placeholder="Search Employees"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                    <option value="">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                </select>
            </div>

            {/* Employee Form */}
            <form onSubmit={saveEmployee}>
                <input
                    type="text"
                    placeholder="First Name"
                    value={currentEmployee.first_name}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, first_name: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Last Name"
                    value={currentEmployee.last_name}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, last_name: e.target.value })}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={currentEmployee.email}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Department"
                    value={currentEmployee.department}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, department: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="Position"
                    value={currentEmployee.position}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, position: e.target.value })}
                />
                <input
                    type="number"
                    placeholder="Salary"
                    value={currentEmployee.salary}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, salary: e.target.value })}
                    required
                />
                <button type="submit">{isEditing ? 'Update Employee' : 'Add Employee'}</button>
                {isEditing && (
                    <button type="button" className="cancel" onClick={resetForm}>
                        Cancel
                    </button>
                )}
            </form>

            {/* Employee List */}
            <div className="employee-list">
                {employees.map((employee) => (
                    <div key={employee._id} className="employee-card">
                        <div>
                            <h3>{`${employee.first_name} ${employee.last_name}`}</h3>
                            <p>{employee.email}</p>
                            <p>{employee.department} - {employee.position}</p>
                            <p>Salary: ${employee.salary}</p>
                        </div>
                        <div className="actions">
                            <button className="view" onClick={() => fetchSingleEmployee(employee._id)}>
                                View
                            </button>
                            <button className="delete" onClick={() => deleteEmployee(employee._id)}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EmployeeManagement;