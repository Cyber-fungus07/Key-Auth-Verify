import express from "express";
export const router = express.Router();

import {TypingWord} from "../modals/typing.model.js";

// ==============================================`========
// GET ALL TYPING DATA
// ======================================================
// GET /api/typing

router.get("/", async (req, res) => {
  try {
    const typingData = await TypingWord.find()
      .populate("user", "username email")
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: typingData.length,
      data: typingData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ======================================================
// GET DATA OF SPECIFIC USER
// ======================================================
// GET /api/typing/user/:userId

router.get("/user/:userId", async (req, res) => {
  try {
    const typingData = await TypingWord.find({
      user: req.params.userId,
    })
      .populate("user", "username email")
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: typingData.length,
      data: typingData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ======================================================
// GET SINGLE RECORD
// ======================================================
// GET /api/typing/:id

router.get("/:id", async (req, res) => {
  try {
    const typingRecord = await TypingWord.findById(req.params.id).populate(
      "user",
      "username email",
    );

    if (!typingRecord) {
      return res.status(404).json({
        success: false,
        message: "Typing record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: typingRecord,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
