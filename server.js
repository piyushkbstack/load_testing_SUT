const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/apiRoutes');
const uiRoutes = require('./routes/uiRoutes');

const app = express();
const PORT = 3000;

// Middleware to parse incoming request bodies
// This is necessary to handle the POST request from the /login form.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Mount the route modules
// The order here ensures UI routes (like /login and /dashboard) and API routes 
// are correctly loaded onto the application instance.
app.use('/', uiRoutes);    // Handles login, dashboard, and UI pages
app.use('/', apiRoutes);   // Handles all API endpoints

// --- Root Endpoint (Redirect to Login) ---
// If a user navigates to http://localhost:3000/, redirect them to the login page.
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Custom SUT running at http://localhost:${PORT}`);
    console.log(`Login URL: http://localhost:${PORT}/login`);
});
