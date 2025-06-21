import UserTaskParticipation from "@models/user.task.participation.model";
import Quest from "../models/quest.model";
import Tent from "../models/tent.model";
import TentType from "@models/tent.type.model";
import { Types } from "mongoose";

interface QuestionParticipationData {
  taskId: string;
  questId: Types.ObjectId;
  quizParentId: string;
  answers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  points: number;
  xp: number;
  status: "VALID" | "INVALID" | "PENDING" | "REJECTED";
  airLyftParticipationId: string;
  participatedAt: Date;
  providerId?: string | null;
  taskData?: any;
}

export class QuestRepository {
  // Tent methods
  async createTent(tentData: any) {
    const tent = new Tent(tentData);
    return await tent.save();
  }

  async findTentByEventId(eventId: string) {
    return await Tent.findOne({ eventId }).populate("tentType");
  }

  async findTentById(tentId: Types.ObjectId) {
    return await Tent.findById(tentId).populate("tentType");
  }

  async updateTentQuestIds(tentId: string, questIds: string[]) {
    return await Tent.findByIdAndUpdate(
      tentId,
      { $push: { questIds: { $each: questIds } } },
      { new: true }
    );
  }

  async findTentTypeByName(tentType: string) {
    return await TentType.findOne({ tentType, isActive: true });
  }

  async findTentsByType(tentTypeId: Types.ObjectId) {
    return await Tent.find({ tentType: tentTypeId });
  }

  async getAllTents() {
    return await Tent.find().populate("questIds").populate("tentType");
  }

  // Quest methods
  async createQuest(questData: any) {
    const quest = new Quest(questData);
    return await quest.save();
  }

  async findQuestByTaskId(taskId: string) {
    return await Quest.findOne({ taskId });
  }

  async findQuestById(questId: Types.ObjectId) {
    return await Quest.findById(questId);
  }

  async createMultipleQuests(questsData: any[]) {
    return await Quest.insertMany(questsData);
  }

  async findQuestsByEventId(eventId: string) {
    const tent = await this.findTentByEventId(eventId);
    if (!tent) return [];

    return await Quest.find({ tentId: tent._id });
  }

  // Update quest dynamic prerequisites
  async updateQuestDynamicPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[],
    condition: "AND" | "OR"
  ) {
    return await Quest.findByIdAndUpdate(
      questId,
      {
        dynamicPrerequisites: prerequisites,
        prerequisiteCondition: condition,
      },
      { new: true }
    );
  }

  // Update quest custom prerequisites
  async updateQuestCustomPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ) {
    return await Quest.findByIdAndUpdate(
      questId,
      { customPrerequisites: prerequisites },
      { new: true }
    );
  }

  // Get quests by task IDs
  async findQuestsByTaskIds(taskIds: string[]): Promise<any[]> {
    return await Quest.find({ taskId: { $in: taskIds } });
  }

  // Get all quests with their prerequisites populated
  async getQuestsWithPrerequisites() {
    return await Quest.find()
      .populate("dynamicPrerequisites")
      .populate("customPrerequisites");
  }

  // Create task ID to quest ID mapping
  async createTaskIdToQuestIdMap(): Promise<Map<string, Types.ObjectId>> {
    const quests = await Quest.find({}, "taskId _id");
    const map = new Map<string, Types.ObjectId>();

    quests.forEach((quest) => {
      map.set(quest.taskId, quest._id);
    });

    return map;
  }

  // Create quest ID to task ID mapping
  async createQuestIdToTaskIdMap(): Promise<Map<string, string>> {
    const quests = await Quest.find({}, "taskId _id");
    const map = new Map<string, string>();

    quests.forEach((quest) => {
      map.set(quest._id.toString(), quest.taskId);
    });

    return map;
  }

  async getQuestsByTentId(tentId: string) {
    return await Quest.find({ tentId })
      .populate("dynamicPrerequisites")
      .populate("customPrerequisites")
      .sort({ order: 1 });
  }

  // UserTaskParticipation methods
  async createOrUpdateUserTaskParticipation(data: {
    userId: string;
    eventId: string;
    tentId?: string;
    participations: any[];
  }) {
    const { userId, eventId, tentId, participations } = data;

    // Calculate totals
    const totalPoints = participations.reduce(
      (sum, p) => sum + (p.points || 0),
      0
    );
    const totalXp = participations.reduce((sum, p) => sum + (p.xp || 0), 0);
    const completedTasksCount = participations.filter(
      (p) => p.status === "VALID"
    ).length;

    return await UserTaskParticipation.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), eventId },
      {
        $set: {
          tentId: tentId ? new Types.ObjectId(tentId) : null,
          participations,
          totalPoints,
          totalXp,
          completedTasksCount,
          lastUpdated: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  async getUserTaskParticipation(userId: string, eventId: string) {
    return await UserTaskParticipation.findOne({
      userId: new Types.ObjectId(userId),
      eventId,
    })
      .populate("tentId")
      .populate("participations.questId");
  }

  async getUserAllParticipations(userId: string) {
    return await UserTaskParticipation.find({
      userId: new Types.ObjectId(userId),
    })
      .populate("tentId")
      .populate("participations.questId");
  }

  async getEventParticipations(eventId: string) {
    return await UserTaskParticipation.find({ eventId })
      .populate("userId")
      .populate("tentId")
      .populate("participations.questId");
  }

  // Quiz-specific methods
  async findQuizByTaskId(taskId: string) {
    return await Quest.findOne({
      taskId,
      parentId: null, // Ensure it's a parent quiz
      taskType: "QUIZ_PLAY",
    });
  }

  async findQuestionsByQuizTaskId(quizTaskId: string) {
    return await Quest.find({
      parentId: quizTaskId,
      taskType: "QUIZ_PLAY",
    }).sort({ order: 1 });
  }

  async findQuestionByTaskId(questionTaskId: string) {
    return await Quest.findOne({
      taskId: questionTaskId,
      parentId: { $ne: null }, // Ensure it's a question (has parent)
      taskType: "QUIZ_PLAY",
    });
  }

  async getQuizParticipationStatus(userId: string, quizTaskId: string) {
    // Get all questions for this quiz
    const questions = await this.findQuestionsByQuizTaskId(quizTaskId);
    const questionTaskIds = questions.map((q) => q.taskId);

    // Get user participation for these questions
    return await UserTaskParticipation.findOne({
      userId: new Types.ObjectId(userId),
      "participations.taskId": { $in: questionTaskIds },
    });
  }

  async updateQuestionParticipation(
    userId: string,
    eventId: string,
    questionData: QuestionParticipationData
  ) {
    const userObjectId = new Types.ObjectId(userId);

    // Try to find existing participation record
    let participation = await UserTaskParticipation.findOne({
      userId: userObjectId,
      eventId,
    });

    if (participation) {
      // Check if this question was already answered
      const existingParticipationIndex = participation.participations.findIndex(
        (p) => p.taskId === questionData.taskId
      );

      if (existingParticipationIndex >= 0) {
        participation.participations[existingParticipationIndex] = {
          ...participation.participations[existingParticipationIndex],
          answers: questionData.answers,
          correctAnswers: questionData.correctAnswers,
          isCorrect: questionData.isCorrect,
          points: questionData.points,
          xp: questionData.xp,
          status: questionData.status,
          providerId: questionData.providerId || null,
          participatedAt: new Date(),
          taskData: questionData.taskData,
          airLyftParticipationId: questionData.airLyftParticipationId,
        };
      } else {
        // Add new question participation using push
        participation.participations.push({
          taskId: questionData.taskId,
          questId: questionData.questId,
          quizParentId: questionData.quizParentId,
          answers: questionData.answers,
          correctAnswers: questionData.correctAnswers,
          isCorrect: questionData.isCorrect,
          points: questionData.points,
          xp: questionData.xp,
          status: questionData.status,
          providerId: questionData.providerId || null,
          participatedAt: questionData.participatedAt,
          taskData: questionData.taskData || null,
          airLyftParticipationId: questionData.airLyftParticipationId,
        });
      }

      // Recalculate totals
      participation.totalPoints = participation.participations.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      participation.totalXp = participation.participations.reduce(
        (sum, p) => sum + (p.xp || 0),
        0
      );
      participation.completedTasksCount = participation.participations.filter(
        (p) => p.status === "VALID"
      ).length;
      participation.lastUpdated = new Date();

      return await participation.save();
    } else {
      // Create new participation record
      return await UserTaskParticipation.create({
        userId: userObjectId,
        eventId,
        participations: [
          {
            taskId: questionData.taskId,
            questId: questionData.questId,
            quizParentId: questionData.quizParentId,
            answers: questionData.answers,
            correctAnswers: questionData.correctAnswers,
            isCorrect: questionData.isCorrect,
            points: questionData.points,
            xp: questionData.xp,
            status: questionData.status,
            providerId: questionData.providerId || null,
            participatedAt: questionData.participatedAt,
            taskData: questionData.taskData || null,
            airLyftParticipationId: questionData.airLyftParticipationId,
          },
        ],
        totalPoints: questionData.points,
        totalXp: questionData.xp,
        completedTasksCount: questionData.status === "VALID" ? 1 : 0,
        lastUpdated: new Date(),
      });
    }
  }

  async getQuizProgressByUserId(userId: string, quizTaskId: string) {
    const questions = await this.findQuestionsByQuizTaskId(quizTaskId);
    const participation = await this.getQuizParticipationStatus(
      userId,
      quizTaskId
    );

    const totalQuestions = questions.length;
    let answeredQuestions = 0;
    let correctAnswers = 0;
    let earnedPoints = 0;
    let earnedXP = 0;

    if (participation) {
      const questionTaskIds = questions.map((q) => q.taskId);
      const answeredParticipations = participation.participations.filter((p) =>
        questionTaskIds.includes(p.taskId)
      );

      answeredQuestions = answeredParticipations.length;
      correctAnswers = answeredParticipations.filter(
        (p) => p.status === "VALID"
      ).length;
      earnedPoints = answeredParticipations.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      earnedXP = answeredParticipations.reduce(
        (sum, p) => sum + (p.xp || 0),
        0
      );
    }

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const totalXP = questions.reduce((sum, q) => sum + (q.xp || 0), 0);

    return {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      earnedPoints,
      earnedXP,
      totalPoints,
      totalXP,
      progress:
        totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
      isCompleted: answeredQuestions === totalQuestions,
    };
  }
}
