const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vowflo backend! 🚀', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Vowflo backend running on port ${PORT}`));
