import mongoose from "mongoose";

const schema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  chapter_number: Number,
  title: String,
  content: String,
});

schema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default mongoose.model("Chapter", schema);
