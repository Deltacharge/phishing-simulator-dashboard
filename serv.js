const express = require('express');
app = express();
app.use(express.static('public'));

PORT = 3336;


app.get('/', (req, res) => {
  const targetId = req.params.id;
  // Log the tracking information
    console.log(`Tracking pixel accessed for target ID: `);
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
