import mongoose from "mongoose";

const schema = mongoose.schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  questions: [
    {
      question: String,
      options: [String],
      correct_index: number,
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

export default mongoose.model("Exam", schema);
