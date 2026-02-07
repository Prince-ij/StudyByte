import mongoose from "mongoose";

const schema = mongoose.Schema({
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  questions: [
    {
      question: String,
      options: [String],
      correct_index: Number,
    },
  ],
});

schema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

export default mongoose.model("Quiz", schema);
