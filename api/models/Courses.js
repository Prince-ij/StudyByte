import mongoose from "mongoose";

const schema = mongoose.Schema({
  title: String,
  description: String,
});

schema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default mongoose.model("Course", schema);
