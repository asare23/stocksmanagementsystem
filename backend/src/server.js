const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Stock Management System API listening on port ${PORT}`);
});
