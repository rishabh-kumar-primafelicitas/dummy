import { Types } from "mongoose";
import { QuestRepository } from "../repositories/quest.repository";
import { InternalServerError } from "errors";

interface GuardRule {
  ruleType: string;
  stringValue?: string;
  intValue?: number;
  dateValue?: string;
  operator: string;
}

interface GuardConfig {
  condition: "AND" | "OR";
  rules: GuardRule[];
}

export class PrerequisiteService {
  private questRepository: QuestRepository;

  constructor() {
    this.questRepository = new QuestRepository();
  }

  /**
   * Parse guardConfig TASK_ID rules and convert to Quest ObjectIds
   */
  async parseTaskIdRules(
    guardConfig: GuardConfig | null,
    questMap: Map<string, Types.ObjectId>
  ): Promise<{
    prerequisites: Types.ObjectId[];
    condition: "AND" | "OR";
  }> {
    if (!guardConfig || !guardConfig.rules) {
      return { prerequisites: [], condition: "AND" };
    }

    const taskIdRules = guardConfig.rules.filter(
      (rule) => rule.ruleType === "TASK_ID" && rule.operator === "EQ"
    );

    const prerequisites: Types.ObjectId[] = [];

    for (const rule of taskIdRules) {
      if (rule.stringValue && questMap.has(rule.stringValue)) {
        const questId = questMap.get(rule.stringValue);
        if (questId) {
          prerequisites.push(questId);
        }
      }
    }

    return {
      prerequisites,
      condition: guardConfig.condition || "AND",
    };
  }

  /**
   * Set custom prerequisites for a specific quest
   */
  async setCustomPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ): Promise<void> {
    await this.questRepository.updateQuestCustomPrerequisites(
      questId,
      prerequisites
    );
  }

  /**
   * Set predefined cross-campaign rules
   */
  async setCustomCrossCampaignRules(
    questsByTentAndOrder: Map<string, Types.ObjectId>
  ): Promise<void> {
    try {
      // Get quest IDs
      const socialQuest1 = questsByTentAndOrder.get("Social_Quest_1");
      const socialQuest2 = questsByTentAndOrder.get("Social_Quest_2");
      const socialQuest3 = questsByTentAndOrder.get("Social_Quest_3");
      const educationalQuest1 = questsByTentAndOrder.get("Educational_Quest_1");
      const educationalQuest2 = questsByTentAndOrder.get("Educational_Quest_2");

      // Educational Quest 1 requires Social Quest 1 & 2
      if (educationalQuest1 && socialQuest1 && socialQuest2) {
        await this.setCustomPrerequisites(educationalQuest1, [
          socialQuest1,
          socialQuest2,
        ]);
      }

      // Social Quest 3 requires Educational Quest 1
      if (socialQuest3 && educationalQuest1) {
        await this.setCustomPrerequisites(socialQuest3, [educationalQuest1]);
      }

      // Educational Quest 2 requires Social Quest 3
      if (educationalQuest2 && socialQuest3) {
        await this.setCustomPrerequisites(educationalQuest2, [socialQuest3]);
      }
    } catch (error: any) {
      throw new InternalServerError(
        `Failed to set cross-campaign rules: ${error.message}`
      );
    }
  }

  /**
   * Helper method to extract ObjectId from populated or non-populated prerequisite
   */
  private getPrerequisiteId(prerequisite: any): string {
    if (typeof prerequisite === "string") {
      return prerequisite;
    }
    if (prerequisite && prerequisite._id) {
      return prerequisite._id.toString();
    }
    if (prerequisite && prerequisite.toString) {
      return prerequisite.toString();
    }
    return prerequisite;
  }

  /**
   * Helper method to extract taskId from populated prerequisite
   */
  private getPrerequisiteTaskId(prerequisite: any): string | null {
    // If it's a populated object with taskId, return it directly
    if (prerequisite && prerequisite.taskId) {
      return prerequisite.taskId;
    }
    // Otherwise, we need to look it up in the map
    return null;
  }

  /**
   * Get all prerequisites (dynamic + custom) for validation purposes
   */
  private getAllPrerequisitesForValidation(quest: any): Types.ObjectId[] {
    const dynamicPrereqs = quest.dynamicPrerequisites || [];
    const customPrereqs = quest.customPrerequisites || [];

    // Convert to ObjectIds if they're populated objects
    const dynamicIds = dynamicPrereqs.map((prereq: any) => {
      if (prereq && prereq._id) {
        return prereq._id;
      }
      return prereq;
    });

    const customIds = customPrereqs.map((prereq: any) => {
      if (prereq && prereq._id) {
        return prereq._id;
      }
      return prereq;
    });

    return [...dynamicIds, ...customIds];
  }

  /**
   * Check if dynamic prerequisites (from guardConfig) are met
   */
  checkDynamicPrerequisitesMet(
    dynamicPrerequisites: any[],
    condition: "AND" | "OR",
    userCompletions: Map<string, Set<string>>,
    questTaskIdMap: Map<string, string>
  ): boolean {
    if (dynamicPrerequisites.length === 0) {
      return true;
    }

    const prereqResults = dynamicPrerequisites.map((prerequisite) => {
      // Try to get taskId directly from populated object first
      let taskId: string | null = this.getPrerequisiteTaskId(prerequisite);

      // If not available, look it up in the map
      if (!taskId) {
        const prereqId = this.getPrerequisiteId(prerequisite);
        taskId = questTaskIdMap.get(prereqId) || null;
      }

      if (!taskId) return false;

      // Check if this task is completed in any tent
      for (const completedTasks of userCompletions.values()) {
        if (completedTasks.has(taskId)) {
          return true;
        }
      }
      return false;
    });

    return condition === "AND"
      ? prereqResults.every(Boolean)
      : prereqResults.some(Boolean);
  }

  /**
   * Check if custom prerequisites are met (always AND logic)
   */
  checkCustomPrerequisitesMet(
    customPrerequisites: any[],
    userCompletions: Map<string, Set<string>>,
    questTaskIdMap: Map<string, string>
  ): boolean {
    if (customPrerequisites.length === 0) {
      return true;
    }

    // Custom prerequisites always use AND logic
    const prereqResults = customPrerequisites.map((prerequisite) => {
      // Try to get taskId directly from populated object first
      let taskId: string | null = this.getPrerequisiteTaskId(prerequisite);

      // If not available, look it up in the map
      if (!taskId) {
        const prereqId = this.getPrerequisiteId(prerequisite);
        taskId = questTaskIdMap.get(prereqId) || null;
      }

      if (!taskId) return false;

      // Check if this task is completed in any tent
      for (const completedTasks of userCompletions.values()) {
        if (completedTasks.has(taskId)) {
          return true;
        }
      }
      return false;
    });

    return prereqResults.every(Boolean); // Always AND for custom prerequisites
  }

  /**
   * Check other guard rules (DATE, MAX_PARTICIPANTS) - EXCLUDE TASK_ID rules
   */
  checkOtherGuardRules(guardConfig: any, quest: any): boolean {
    if (!guardConfig || !guardConfig.rules) {
      return true;
    }

    const currentDate = new Date();
    let allRulesMet = true;

    for (const rule of guardConfig.rules) {
      switch (rule.ruleType) {
        case "DATE":
          if (rule.dateValue) {
            const ruleDate = new Date(rule.dateValue);
            if (rule.operator === "GT" && currentDate <= ruleDate) {
              allRulesMet = false;
            } else if (rule.operator === "LT" && currentDate >= ruleDate) {
              allRulesMet = false;
            }
          }
          break;

        case "MAX_PARTICIPANTS":
          if (rule.intValue !== null && rule.intValue !== undefined) {
            const currentParticipants = quest.participantCount || 0;

            switch (rule.operator) {
              case "LTE":
                if (currentParticipants > rule.intValue) {
                  allRulesMet = false;
                }
                break;
              case "LT":
                if (currentParticipants >= rule.intValue) {
                  allRulesMet = false;
                }
                break;
              case "GTE":
                if (currentParticipants < rule.intValue) {
                  allRulesMet = false;
                }
                break;
              case "GT":
                if (currentParticipants <= rule.intValue) {
                  allRulesMet = false;
                }
                break;
              case "EQ":
                if (currentParticipants !== rule.intValue) {
                  allRulesMet = false;
                }
                break;
            }
          }
          break;

        // IMPORTANT: Skip TASK_ID rules - they're handled in dynamic prerequisites
        case "TASK_ID":
          break;

        default:
          // Unknown rule type - assume it's met for now
          break;
      }
    }

    return allRulesMet;
  }

  /**
   * Determine if a quest is locked based on all rules
   */
  isQuestLocked(
    quest: any,
    userCompletions: Map<string, Set<string>>,
    questTaskIdMap: Map<string, string>
  ): boolean {
    // Check dynamic prerequisites (from guardConfig TASK_ID rules)
    const dynamicPrerequisites = quest.dynamicPrerequisites || [];
    const dynamicPrereqsMet = this.checkDynamicPrerequisitesMet(
      dynamicPrerequisites,
      quest.prerequisiteCondition || "AND",
      userCompletions,
      questTaskIdMap
    );

    // Check custom prerequisites (cross-campaign dependencies)
    const customPrerequisites = quest.customPrerequisites || [];
    const customPrereqsMet = this.checkCustomPrerequisitesMet(
      customPrerequisites,
      userCompletions,
      questTaskIdMap
    );

    // Check other guard rules (DATE, MAX_PARTICIPANTS)
    const otherRulesMet = this.checkOtherGuardRules(quest.guardConfig, quest);

    // Quest is locked if ANY of these conditions fail:
    // 1. Dynamic prerequisites not met
    // 2. Custom prerequisites not met
    // 3. Other guard rules not met
    return !dynamicPrereqsMet || !customPrereqsMet || !otherRulesMet;
  }

  /**
   * Validate custom prerequisites to prevent circular dependencies
   */
  async validateCustomPrerequisites(
    questId: Types.ObjectId,
    prerequisites: Types.ObjectId[]
  ): Promise<{ valid: boolean; error?: string }> {
    // Check for self-reference
    if (prerequisites.some((id) => id.equals(questId))) {
      return {
        valid: false,
        error: "Quest cannot be a prerequisite of itself",
      };
    }

    // Check for circular dependencies (basic check)
    // More sophisticated cycle detection would be needed for complex scenarios
    for (const prereqId of prerequisites) {
      const prereqQuest = await this.questRepository.findQuestById(prereqId);
      if (prereqQuest) {
        const prereqPrerequisites =
          this.getAllPrerequisitesForValidation(prereqQuest);
        if (
          prereqPrerequisites.some((id: Types.ObjectId) => id.equals(questId))
        ) {
          return {
            valid: false,
            error: "Circular dependency detected",
          };
        }
      }
    }

    return { valid: true };
  }
}
