import mongoose from 'mongoose';

export default function connectDB() {
   mongoose
    .connect(process.env.MONGO_URI)
    .then((conn) => {
      console.log('Database[MongoDB] Successfully Connected');
      console.log(conn.connection.host + ' ' + conn.connection.name);
    })
    .catch((err) => {
      console.log('Database[MongoDB] connection error : ', err);
    });
}
