import mongoose from "mongoose";

const schema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  status: {
    type: String,
    enum: ["not started", "in progress", "completed"],
  },
  completed_chapters: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  ],
  chapter_quiz_results: [
    {
      chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
      score: Number,
      attemps: {
        type: Number,
        default: 0,
      },
    },
  ],
  final_exam_results: [
    {
      score: Number,
      attempts: {
        type: Number,
        default: 0,
      },
      passed: Boolean,
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

export default mongoose.schema("Enrollment", schema);
