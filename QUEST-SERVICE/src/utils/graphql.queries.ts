// export const FETCH_CAMPAIGNS_QUERY = `
// query ProjectEvents($pagination: PaginationInput!, $where: ProjectEventWhereInput!) {
//   projectEvents(pagination: $pagination, where: $where) {
//     data {
//       id
//       title
//       publicLink
//       startTime
//       endTime
//       updatedAt
//       bannerUrl
//       state
//       visibility
//       settledAt
//       settlementFiles
//       summary {
//         totalPointsEarned
//         totalPoints
//         totalTasks
//         __typename
//       }
//       project {
//         publicLink
//         __typename
//       }
//       __typename
//       description
//     }
//     total
//     __typename
//   }
// }`;

// export const FETCH_CAMPAIGNS_QUERY = `query ExploreEvents($pagination: PaginationInput!, $where: PublicProjectEventWhereInput) {
//   exploreEvents(pagination: $pagination, where: $where) {
//     total
//     data {
//       createdAt
//       updatedAt
//       id
//       title
//       startTime
//       publicLink
//       endTime
//       description
//       bannerUrl
//       state
//       settlementFiles
//       settledAt
//       eventType
//       visibility
//       mode
//       summary {
//         __typename
//         totalParticipants
//         totalPoints
//         totalPointsEarned
//         totalTaskParticipation
//         totalTasks
//         totalXP
//       }
//       rewardTitle
//       rewardSubtitle
//       ipProtect
//       leaderboard
//       seasonId
//       tags
//       project {
//         createdAt
//         updatedAt
//         id
//         name
//         publicLink
//         bio
//         logo
//         bannerUrl
//         contactEmail
//         webhookSecret
//         verified
//         visibility
//         isHideQbRecentEvents
//         projectUrls {
//           createdAt
//           updatedAt
//           id
//           urlType
//           url
//           data
//         }
//         projectEvents {
//           createdAt
//           updatedAt
//           id
//           title
//           startTime
//           publicLink
//           endTime
//           description
//           bannerUrl
//           state
//           settledAt
//           eventType
//           visibility
//           mode
//           rewardTitle
//           rewardSubtitle
//           ipProtect
//           leaderboard
//           seasonId
//           tags
//         }
//         integrations {
//           createdAt
//           updatedAt
//           id
//           name
//           displayName
//           type
//           auth {
//             __typename
//           }
//           provider
//           providerId
//           events {
//             __typename
//             createdAt
//             eventId
//             integrationId
//             projectId
//             routeId
//             updatedAt
//           }
//           tasks {
//             createdAt
//             updatedAt
//             task {
//               __typename
//             }
//             taskId
//             integration {
//               createdAt
//               updatedAt
//               id
//               name
//               displayName
//               type
//               auth {
//                 __typename
//               }
//               provider
//               providerId
//               events {
//                 __typename
//               }
//               tasks {
//                 __typename
//               }
//             }
//             integrationId
//             routeId
//           }
//         }
//         followerCount
//         ecosystems
//         referredEcosystem
//         referralId
//         sectors
//         plan
//         billings {
//           __typename
//         }
//         seasons {
//           __typename
//         }
//       }
//       giveawaySummary {
//         __typename
//       }
//     }
//     __typename
//   }
// }`;

export const FETCH_CAMPAIGNS_QUERY = `
query ExploreEvents($pagination: PaginationInput!, $where: PublicProjectEventWhereInput) {
  exploreEvents(pagination: $pagination, where: $where) {
    total
    data {
      createdAt
      updatedAt
      id
      title
      startTime
      publicLink
      endTime
      description
      bannerUrl
      state
      settlementFiles
      settledAt
      eventType
      visibility
      mode
      summary {
        __typename
        totalParticipants
        totalPoints
        totalPointsEarned
        totalTaskParticipation
        totalTasks
        totalXP
      }
      rewardTitle
      rewardSubtitle
      ipProtect
      leaderboard
      seasonId
      tags
    }
    __typename
  }
}`;

export const TASK_INFO_FRAGMENTS = `fragment DiscordJoinTaskDataFragment on DiscordJoinTaskData {
  guildId
  guildName
  url
  __typename
}

fragment TelegramJoinTaskDataFragment on TelegramJoinTaskData {
  username
  chatId
  title
  type
  __typename
}

fragment LinkTaskDataFragment on LinkTaskData {
  url
  __typename
}

fragment EvmContractInteractTaskDataFragment on EvmContractInteractTaskData {
  blockchainId
  verifiedWallet
  contractAddress
  function {
    name
    type
    inputs {
      name
      type
      internalType
      __typename
    }
    outputs {
      name
      type
      internalType
      __typename
    }
    stateMutability
    __typename
  }
  inputParams {
    id
    order
    title
    value
    widget
    __typename
  }
  condition {
    t
    condition {
      value
      values
      operator
      __typename
    }
    __typename
  }
  __typename
}

fragment SubstrateQueryTaskDataFragment on SubstrateQueryTaskData {
  blockchainId
  section
  method
  verifiedWallet
  substrateValidation: validation
  substrateInputParams: inputParams {
    id
    order
    title
    values {
      value
      __typename
    }
    widget
    __typename
  }
  __typename
}

fragment FormAnswerTaskDataFragment on FormAnswerTaskDataItems {
  items {
    id
    order
    title
    widget
    required
    hidden
    values {
      value
      __typename
    }
    __typename
  }
  __typename
}

fragment UploadTaskDataFragment on UploadTaskData {
  urls
  maxCount
  fileTypes
  maxSize
  __typename
}

fragment TwitterFollowTaskDataFragment on TwitterFollowTaskData {
  url
  __typename
}

fragment TwitterLikeTaskDataFragment on TwitterLikeTaskData {
  url
  __typename
}

fragment TwitterLikeRetweetTaskDataFragment on TwitterLikeRetweetTaskData {
  url
  actions
  __typename
}

fragment TwitterPostTaskDataFragment on TwitterPostTaskData {
  content
  tweetSubmitType: type
  optionalUrl: url
  hashtags
  userMentions
  mentionsCount
  __typename
}

fragment TwitterRetweetTaskDataFragment on TwitterRetweetTaskData {
  url
  __typename
}

fragment TwitterUgcTaskDataFragment on TwitterUgcTaskData {
  includeText
  tweetSubmitType: type
  optionalUrl: url
  hashtags
  userMentions
  mentionsCount
  minimumMediaEntries
  __typename
}

fragment SubsocialFollowTaskDataFragment on SubsocialFollowTaskData {
  spaceId
  handle
  __typename
}

fragment SubsocialPostTaskDataFragment on SubsocialPostTaskData {
  spaceId
  handle
  __typename
}

fragment SubsocialCommentTaskDataFragment on SubsocialCommentTaskData {
  postUrl
  postId
  __typename
}

fragment SubsocialShareTaskDataFragment on SubsocialShareTaskData {
  postUrl
  postId
  __typename
}

fragment SubsocialUpvoteTaskDataFragment on SubsocialUpvoteTaskData {
  postUrl
  postId
  __typename
}

fragment NullableDataFragment on NullableTaskData {
  isNull
  __typename
}

fragment QuizTaskDataFragment on QuizTaskData {
  questionType
  options {
    text
    id
    isCorrect
    order
    __typename
  }
  __typename
}

fragment WalletAddressTaskDataFragment on WalletAddressTaskData {
  blockchainId
  verify
  verificationType: verification
  excludedWallets
  verifiedWallet
  __typename
}

fragment SubgraphRawTaskDataFragment on SubgraphRawTaskData {
  query
  validation
  blockchainId
  blockchainType
  verifiedWallet
  __typename
}

fragment RestRawTaskDataFragment on RestRawTaskData {
  url
  validation
  optionalBlockchainId: blockchainId
  optionalVerifiedWallet: verifiedWallet
  requestType
  queryParams {
    key
    value
    __typename
  }
  bodyParams {
    key
    value
    __typename
  }
  headers {
    key
    value
    __typename
  }
  __typename
}

fragment EmailWhitelistTaskDataFragment on EmailWhitelistTaskData {
  verification
  __typename
}

fragment AirboostReferralTaskDataFragment on AirboostReferralTaskData {
  shareTitle
  shareBody
  max
  __typename
}

fragment SignTermsTaskDataFragment on SignTermsTaskData {
  terms
  optionalBlockchainId: blockchainId
  __typename
}

fragment FaucetTaskDataFragment on FaucetRawTaskData {
  blockchainId
  amountPerUser
  maxUser
  allocationCSVExists
  __typename
}

fragment AirquestFollowTaskDataFragment on AirquestFollowTaskData {
  projectId
  projectName
  url
  __typename
}

fragment LuckydrawTaskDataFragment on LuckydrawTaskData {
  rewardType
  luckydrawType
  rewards {
    amount
    __typename
  }
  slotMachineIcons
  __typename
}

fragment MobileAppTaskFragment on MobileAppTaskData {
  playStoreUrl
  appStoreUrl
  __typename
}

fragment ProducthuntUpvoteTaskDataFragment on ProducthuntUpvoteTaskData {
  postTitle
  postUrl
  __typename
}

fragment BlogCommentTaskFragment on BlogCommentTaskData {
  blogUrl
  __typename
}

fragment ProducthuntFollowTaskDataFragment on ProducthuntFollowTaskData {
  userUrl
  __typename
}

fragment KickstarterTaskFragment on KickstarterTaskData {
  projectUrl
  __typename
}

fragment TaskInfo on Task {
  info {
    ...DiscordJoinTaskDataFragment
    ...TelegramJoinTaskDataFragment
    ...LinkTaskDataFragment
    ...EvmContractInteractTaskDataFragment
    ...SubstrateQueryTaskDataFragment
    ...FormAnswerTaskDataFragment
    ...UploadTaskDataFragment
    ...TwitterFollowTaskDataFragment
    ...TwitterLikeTaskDataFragment
    ...TwitterLikeRetweetTaskDataFragment
    ...TwitterPostTaskDataFragment
    ...TwitterRetweetTaskDataFragment
    ...TwitterUgcTaskDataFragment
    ...SubsocialFollowTaskDataFragment
    ...SubsocialPostTaskDataFragment
    ...SubsocialCommentTaskDataFragment
    ...SubsocialShareTaskDataFragment
    ...SubsocialUpvoteTaskDataFragment
    ...NullableDataFragment
    ...QuizTaskDataFragment
    ...WalletAddressTaskDataFragment
    ...SubgraphRawTaskDataFragment
    ...RestRawTaskDataFragment
    ...EmailWhitelistTaskDataFragment
    ...AirboostReferralTaskDataFragment
    ...SignTermsTaskDataFragment
    ...FaucetTaskDataFragment
    ...AirquestFollowTaskDataFragment
    ...LuckydrawTaskDataFragment
    ...MobileAppTaskFragment
    ...ProducthuntUpvoteTaskDataFragment
    ...BlogCommentTaskFragment
    ...ProducthuntFollowTaskDataFragment
    ...KickstarterTaskFragment
    __typename
  }
  __typename
}`;

export const FETCH_QUESTS_QUERY = `
${TASK_INFO_FRAGMENTS}

query Tasks($eventId: ID!) {
  pTasks(eventId: $eventId) {
    id
    order
    points
    title
    description
    iconUrl
    appType
    taskType
    parentId
    frequency
    xp
    appKey
    taskKey
    verify
    subTaskStats {
      count
      totalPoints
      totalXp
      __typename
    }
    participantCount
    guardConfig {
      condition
      rules {
        intValue
        stringValue
        dateValue
        ruleType
        operator
        __typename
      }
      __typename
    }
    ...TaskInfo
    __typename
  }
}`;

// export const FETCH_QUESTS_QUERY = `
// query PTasks($eventId: ID!) {
//   pTasks(eventId: $eventId) {
//     id
//     order
//     points
//     title
//     description
//     iconUrl
//     appType
//     taskType
//     parentId
//     frequency
//     xp
//     appKey
//     taskKey
//     verify
//     subTaskStats {
//       count
//       totalPoints
//       totalXp
//       __typename
//     }
//     participantCount
//     guardConfig {
//       condition
//       rules {
//         intValue
//         stringValue
//         dateValue
//         ruleType
//         operator
//         __typename
//       }
//       __typename
//     }
//     __typename
//   }
// }`;

export const FETCH_CONNECTION_TOKEN_QUERY = `
query ConnectionToken($provider: AuthProvider!, $projectId: ID) {
  connectionToken(provider: $provider, projectId: $projectId)
}`;

export const USER_EVENT_CONNECTIONS_QUERY = `
query UserEventConnections($eventId: ID!) {
  eventConnections(eventId: $eventId) {
    provider
    providerId
    __typename
  }
}`;

export const AUTH_FRAGMENT = `
fragment AuthFragment on Auth {
  userId
  provider
  providerId
  firstName
  lastName
  picture
  username
  isPrimary
  verified
  updatedAt
  __typename
}`;

export const ME_QUERY = `
${AUTH_FRAGMENT}

query Me($projectId: ID) {
  me(projectId: $projectId) {
    auth {
      ...AuthFragment
      __typename
    }
    createdAt
    email
    firstName
    id
    lastName
    auths {
      createdAt
      updatedAt
      provider
      providerId
      firstName
      lastName
      picture
      username
      isPrimary
      verified
      userId
    }
  }
}`;

export const USER_TASK_PARTICIPATION_FRAGMENTS = `
fragment NullableDataFragment on NullableTaskData {
  isNull
  __typename
}

fragment TwitterUgcParticipationFragment on TwitterUgcTaskParticipationData {
  url
  __typename
}

fragment TwitterPostParticipationFragment on TwitterPostTaskParticipationData {
  url
  __typename
}

fragment QuizParticipationFragment on QuizTaskParticipationData {
  answers
  correctAnswers
  __typename
}

fragment FormParticipationFragment on FormAnswerTaskParticipationData {
  formAnswers: answers {
    id
    value
    __typename
  }
  __typename
}

fragment WalletAddressParticipationFragment on WalletAddressTaskParticipationData {
  address
  __typename
}

fragment SignTermsParticipationFragment on SignTermsTaskParticipationData {
  optionalAddress: address
  __typename
}

fragment UploadTaskParticiapteDataFragment on UploadTaskParticipationData {
  urls
  __typename
}

fragment FaucetParticipationFragment on FaucetTaskParticipationData {
  hash
  address
  amount
  __typename
}

fragment LuckydrawParticipationFragment on LuckydrawTaskParticipationData {
  rewardType
  luckydrawType
  resultIndex
  __typename
}

fragment MobileAppParticipationFragment on MobileAppTaskParticipationData {
  url
  __typename
}

fragment BlogCommentParticipationFragment on BlogCommentTaskParticipationData {
  username
  __typename
}

fragment BlogWriteParticipationFragment on BlogWriteTaskParticipationData {
  blogUrl
  __typename
}

fragment ParticipationInfo on TaskParticipation {
  info {
    ...NullableDataFragment
    ...TwitterUgcParticipationFragment
    ...TwitterPostParticipationFragment
    ...QuizParticipationFragment
    ...FormParticipationFragment
    ...WalletAddressParticipationFragment
    ...UploadTaskParticiapteDataFragment
    ...SignTermsParticipationFragment
    ...FaucetParticipationFragment
    ...LuckydrawParticipationFragment
    ...MobileAppParticipationFragment
    ...BlogCommentParticipationFragment
    ...BlogWriteParticipationFragment
    __typename
  }
  __typename
}`;

export const USER_TASK_PARTICIPATION_QUERY = `
${USER_TASK_PARTICIPATION_FRAGMENTS}

query UserTaskParticipation($eventId: ID!) {
  userTaskParticipation(eventId: $eventId) {
    id
    taskId
    points
    xp
    createdAt
    status
    providerId
    task {
      hidden
      parentId
      taskType
      id
      __typename
    }
    ...ParticipationInfo
    __typename
  }
}`;

export const CREATE_EVENT_CONNECTION_MUTATION = `
mutation CreateEventConnection($eventId: ID!, $provider: AuthProvider!, $providerId: ID!) {
  createEventConnection(
    eventId: $eventId
    provider: $provider
    providerId: $providerId
  ) {
    eventId
    provider
    providerId
    userId
    __typename
  }
}`;

// Mutation to participate in Twitter follow task
export const PARTICIPATE_TWITTER_FOLLOW_TASK_MUTATION = `
mutation ParticipateTwitterFollowTask($eventId: ID!, $taskId: ID!, $providerId: ID!) {
  participateTwitterFollowTask(
    eventId: $eventId
    taskId: $taskId
    providerId: $providerId
  ) {
    identifiers {
      id
      __typename
    }
    __typename
  }
}`;

// Mutation to participate in Discord join task
export const PARTICIPATE_DISCORD_JOIN_TASK_MUTATION = `
mutation ParticipateDiscordJoinTask($eventId: ID!, $providerId: ID!, $taskId: ID!) {
  participateDiscordJoinTask(eventId: $eventId, providerId: $providerId, taskId: $taskId) {
    identifiers {
      id
      __typename
    }
    __typename
  }
}`;

// Mutation to participate in link task
export const PARTICIPATE_LINK_TASK_MUTATION = `
mutation ParticipateLinkTask($eventId: ID!, $taskId: ID!) {
  participateLinkTask(eventId: $eventId, taskId: $taskId) {
    identifiers {
      id
      __typename
    }
    __typename
  }
}`;

export const CONFLICTED_USER_PROFILE_QUERY = `
query ConflictedUserProfile($provider: AuthProvider!, $providerId: ID!) {
  conflictedUserProfile(provider: $provider, providerId: $providerId) {
    picture
    displayName
    providerType
    __typename
  }
}`;

// Mutation to participate in email address task
export const PARTICIPATE_EMAIL_ADDRESS_TASK_MUTATION = `
mutation ParticipateEmailAddressTask($eventId: ID!, $taskId: ID!, $providerId: ID!) {
  participateEmailAddressTask(
    eventId: $eventId
    taskId: $taskId
    providerId: $providerId
  ) {
    identifiers {
      id
      __typename
    }
    __typename
  }
}`;

// Mutation to participate in quiz play task
export const PARTICIPATE_QUIZ_PLAY_TASK_MUTATION = `
mutation ParticipateQuizPlayTask($eventId: ID!, $taskId: ID!, $data: QuizTaskParticipationInput!) {
  participateQuizPlayTask(eventId: $eventId, taskId: $taskId, data: $data) {
    insertResult {
      identifiers {
        id
        __typename
      }
      __typename
    }
    correctAnswers
    points
    xp
    __typename
  }
}`;

// Fetching questions by parent ID
export const TASKS_BY_PARENT_ID_QUERY = `
${TASK_INFO_FRAGMENTS}

query TasksByParentId($parentId: ID!) {
  pTasksByParentId(parentId: $parentId) {
    id
    order
    points
    title
    description
    iconUrl
    appType
    taskType
    parentId
    frequency
    xp
    appKey
    taskKey
    verify
    subTaskStats {
      count
      totalPoints
      totalXp
      __typename
    }
    participantCount
    guardConfig {
      condition
      rules {
        intValue
        stringValue
        dateValue
        ruleType
        operator
        __typename
      }
      __typename
    }
    ...TaskInfo
    __typename
  }
}`;


