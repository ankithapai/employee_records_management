import React, { useState, useEffect } from 'react';
import './App.css';

// Simple debounce function
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

function EmployeeManagement() {
    const [employees, setEmployees] = useState([]);
    const [currentEmployee, setCurrentEmployee] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        position: '',
        salary: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleDarkMode = () => {
        setIsDarkMode((prevMode) => {
            const newMode = !prevMode;
            localStorage.setItem('darkMode', newMode); // Save to localStorage
            return newMode;
        });
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(5); // Fixed results per page
    const [totalResults, setTotalResults] = useState(0);

    // Fetch employees with search and filter
    const fetchEmployees = async () => {
        try {
            const params = new URLSearchParams({
                search: searchTerm,
                department: selectedDepartment
            });
            const response = await fetch(`http://localhost:5000/employees?${params}&page=${currentPage}&size=${pageSize}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            setEmployees(data.employees || []);
            setTotalResults(data.total || 0);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    // Fetch Suggestions
    const fetchSuggestions = async (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/employees/suggest?q=${query}`);
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
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
        });
        setIsEditing(false);
    };

    // Debounced Fetch Suggestions
    const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

    const handleSuggestionClick = (suggestion) => {
        // Set the full name in the search term
        setSearchTerm(suggestion.text);
        setSuggestions([]); // Clear suggestions
    };

    // Modify handleSearchChange to work with the new suggestion format
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchTerm(query);
        debouncedFetchSuggestions(query);
    };

    // Initial fetch
    useEffect(() => {
        fetchEmployees();
    }, [searchTerm, selectedDepartment, currentPage]);

    // Load dark mode preference on mount
    useEffect(() => {
        const savedPreference = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(savedPreference);
    }, []);

    // Apply dark mode class to the body
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    // Export to CSV
    const exportToCSV = async () => {
        try {
            const response = await fetch('http://localhost:5000/employees/export', {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/csv',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to download CSV');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create a temporary link to download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = 'employees.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
        }
    };


    return (
        <div>
            {/* Dark Mode Button Positioned Properly */}
            <div className="dark-mode-container">
                <button className="dark-mode-button" onClick={toggleDarkMode}>
                    {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>
                <button className="export-button" onClick={exportToCSV}>
                    Export to CSV
                </button>
            </div>
            <div className="container">
                <h1>ASU Employee Management</h1>

                {/* Search and Filter Section */}
                <div className="search-filter">
                    <input
                        type="text"
                        placeholder="Search Employees"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {suggestions.length > 0 && (
                        <ul className="suggestions-dropdown">
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="suggestion-item"
                                >
                                    {suggestion.text}
                                </li>
                            ))}
                        </ul>
                    )}
                    <label>Filter by Department:</label>
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
                {/* Pagination */}
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>
                        Page {currentPage} of {Math.ceil(totalResults / pageSize)}
                    </span>
                    <button
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage * pageSize >= totalResults}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EmployeeManagement;