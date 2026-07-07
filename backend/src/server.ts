import app, { connectDB } from './app';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Gateway API Server running on port ${PORT}`);
  });
};

startServer();
