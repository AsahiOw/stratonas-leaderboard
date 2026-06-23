import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answerLocalChatFallback,
  executeChatTool,
  runChatAgent,
  type ChatCompletionCaller,
  type ChatToolLoaders,
} from './chat-agent'

const binahRaid = {
  id: 'raid-binah-s1',
  season: 1,
  raidBoss: { name: 'Binah' },
  type: { name: 'Total Assault' },
  server: { name: 'Global' },
  terrain: { name: 'Urban' },
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  endDate: new Date('2026-05-08T00:00:00.000Z'),
  isActive: false,
}

const asahi = {
  id: 'player-asahi',
  ign: 'Asahi',
  username: 'tryhard6809',
  userID: '1001',
  club: 'SlackerInc.',
  clubID: 'SL',
  clubId: 'club-slacker',
  clubData: { id: 'club-slacker', name: 'SlackerInc.', uid: 'SL' },
  favouriteStudent: 'Yuuka',
  favouriteStudentData: { id: 10, name: 'Yuuka' },
  isGuildMember: true,
  joinedDate: new Date('2026-05-06T00:00:00.000Z'),
}

const mun = {
  id: 'player-mun',
  ign: 'Mun',
  username: 'tkm112',
  userID: '1002',
  club: 'SlackerInc.',
  clubID: 'SL',
  clubId: 'club-slacker',
  clubData: { id: 'club-slacker', name: 'SlackerInc.', uid: 'SL' },
  favouriteStudent: 'Hoshino (Swimsuit)',
  favouriteStudentData: { id: 11, name: 'Hoshino (Swimsuit)' },
  isGuildMember: true,
  joinedDate: new Date('2026-05-06T00:00:00.000Z'),
}

const asahiProfile = {
  ...asahi,
  entries: [
    { raidId: binahRaid.id, score: 24600000, rank: 4, raid: binahRaid },
  ],
  journey: {
    totalEntries: 1,
    totalScore: 24600000,
    averageScore: 24600000,
    bestRank: 4,
    podiums: 0,
    rankOnes: 0,
    top10s: 1,
    top50s: 1,
    averageRank: 4,
    bestScore: 24600000,
    bestScoreRaid: 'Binah S1',
    participationRate: 100,
    latestRank: 4,
    latestRaid: 'Binah S1',
  },
}

const munProfile = {
  ...mun,
  entries: [
    { raidId: binahRaid.id, score: 24800000, rank: 3, raid: binahRaid },
  ],
  journey: {
    totalEntries: 1,
    totalScore: 24800000,
    averageScore: 24800000,
    bestRank: 3,
    podiums: 1,
    rankOnes: 0,
    top10s: 1,
    top50s: 1,
    averageRank: 3,
    bestScore: 24800000,
    bestScoreRaid: 'Binah S1',
    participationRate: 100,
    latestRank: 3,
    latestRaid: 'Binah S1',
  },
}

const baseLoaders: ChatToolLoaders = {
  getPublicPlayers: async () => [asahi, mun],
  getPublicPlayerProfile: async (id) => id === asahi.id ? asahiProfile : id === mun.id ? munProfile : null,
  getPublicRaids: async () => [binahRaid],
  getPublicRaidEntries: async (_raidId, take) => [
    { rank: 1, name: 'Mun', score: 24800000, playerId: mun.id, club: 'SlackerInc.', isGuild: true },
    { rank: 2, name: 'Asahi', score: 24600000, playerId: asahi.id, club: 'SlackerInc.', isGuild: true },
  ].slice(0, take),
  getPublicStats: async () => ({
    snapshot: { totalPlayers: 2, totalEntries: 2, latestRaids: 0 },
    currentRaidLeaders: [],
    topPlayers: [
      { rank: 1, playerId: mun.id, name: 'Mun', club: 'SlackerInc.', totalScore: 24800000, entryCount: 1, averageScore: 24800000, bestRank: 3, podiums: 1 },
      { rank: 2, playerId: asahi.id, name: 'Asahi', club: 'SlackerInc.', totalScore: 24600000, entryCount: 1, averageScore: 24600000, bestRank: 4, podiums: 0 },
    ],
    clubStandings: [
      { rank: 1, id: 'club-slacker', name: 'SlackerInc.', totalScore: 49400000, entryCount: 2, playerCount: 2, averageScore: 24700000 },
    ],
    raidBreakdown: [
      { id: binahRaid.id, boss: 'Binah', season: 1, type: 'Total Assault', server: 'Global', terrain: 'Urban', isActive: false, startDate: binahRaid.startDate, endDate: binahRaid.endDate, entryCount: 2, uniquePlayers: 2, uniqueClubs: 1, averageScore: 24700000, topPlayer: { name: 'Mun', playerId: mun.id, score: 24800000 } },
    ],
  }),
  getPublicClubSummaries: async () => [
    { id: 'club-slacker', name: 'SlackerInc.', uid: 'SL', rank: 1, totalScore: 49400000, entryCount: 2, playerCount: 2 },
  ],
  getPublicClubProfile: async (id) => id === 'club-slacker'
    ? {
      id: 'club-slacker',
      name: 'SlackerInc.',
      uid: 'SL',
      roster: [],
      stats: { totalScore: 49400000, totalEntries: 2, activePlayerCount: 2, averageScore: 24700000, bestRank: 3, bestRaid: 'Binah S1', podiums: 1 },
    }
    : null,
  getPublicStudents: async () => [
    { id: 10, name: 'Yuuka', school: 'Millennium', club: 'Seminar', birthday: 'March 14', birthDay: '03-14' },
    { id: 11, name: 'Hoshino (Swimsuit)', school: 'Abydos', club: 'Foreclosure Task Force', birthday: 'January 2', birthDay: '01-02', daysUntilBirthday: 2 },
  ],
  getCurrentBirthdayDay: () => ({ key: '12-31' }),
  getPublicBirthdayStudents: async () => [],
  getPublicUpcomingBirthdayStudents: async () => [
    { id: 11, name: 'Hoshino (Swimsuit)', school: 'Abydos', club: 'Foreclosure Task Force', birthday: 'January 2', birthDay: '01-02', daysUntilBirthday: 2 },
  ],
  searchWeb: async (query) => [{ title: `Result for ${query}`, url: 'https://example.com', description: 'Example result.' }],
}

test('search_entities handles partial, typo, and ambiguous player names', async () => {
  const partial = await executeChatTool('search_entities', { query: 'Asah', types: ['players'] }, baseLoaders) as {
    players: { status: string; candidates: Array<{ name: string }> }
  }
  assert.equal(partial.players.status, 'single')
  assert.equal(partial.players.candidates[0]?.name, 'Asahi')

  const typo = await executeChatTool('search_entities', { query: 'Asahiq', types: ['players'] }, baseLoaders) as {
    players: { status: string; candidates: Array<{ name: string }> }
  }
  assert.equal(typo.players.status, 'ambiguous')
  assert.equal(typo.players.candidates[0]?.name, 'Asahi')

  const ambiguousLoaders: ChatToolLoaders = {
    ...baseLoaders,
    getPublicPlayers: async () => [asahi, { ...mun, id: 'player-other-asahi', ign: 'Other', username: 'Asahi' }],
  }
  const ambiguous = await executeChatTool('search_entities', { query: 'Asahi', types: ['players'] }, ambiguousLoaders) as {
    players: { status: string; candidates: Array<{ id: string }> }
  }
  assert.equal(ambiguous.players.status, 'ambiguous')
  assert.equal(ambiguous.players.candidates.length, 2)
})

test('tools return compact player, comparison, and raid data', async () => {
  const profile = await executeChatTool('get_player_profile', { playerId: asahi.id }, baseLoaders) as {
    player: { name: string; stats: { totalScore: number } }
  }
  assert.equal(profile.player.name, 'Asahi')
  assert.equal(profile.player.stats.totalScore, 24600000)

  const comparison = await executeChatTool('compare_players', { playerIds: [asahi.id, mun.id] }, baseLoaders) as {
    players: Array<{ name: string; stats: { averageScore: number } }>
  }
  assert.deepEqual(comparison.players.map((player) => player.name), ['Asahi', 'Mun'])
  assert.equal(comparison.players[1]?.stats.averageScore, 24800000)

  const entries = await executeChatTool('get_raid_entries', { raidId: binahRaid.id, limit: 1 }, baseLoaders) as {
    topEntries: Array<{ player: string }>
  }
  assert.equal(entries.topEntries.length, 1)
  assert.equal(entries.topEntries[0]?.player, 'Mun')
})

test('birthday tool returns upcoming birthday students', async () => {
  const birthdays = await executeChatTool('get_birthdays', { limit: 5, maxDays: 30 }, baseLoaders) as {
    upcoming: Array<{ name: string; daysUntilBirthday?: number }>
  }

  assert.equal(birthdays.upcoming[0]?.name, 'Hoshino (Swimsuit)')
  assert.equal(birthdays.upcoming[0]?.daysUntilBirthday, 2)
})

test('agent resolves pronoun comparisons through current-chat memory', async () => {
  let calls = 0
  const callModel: ChatCompletionCaller = async (body) => {
    calls += 1
    assert.match(JSON.stringify(body.messages), /player-asahi/)

    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        data: {
          model: 'test-tool-model',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call-search',
                type: 'function',
                function: { name: 'search_entities', arguments: JSON.stringify({ query: 'Mun', types: ['players'] }) },
              }],
            },
          }],
        },
      }
    }

    if (calls === 2) {
      return {
        ok: true,
        status: 200,
        data: {
          model: 'test-tool-model',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call-compare',
                type: 'function',
                function: { name: 'compare_players', arguments: JSON.stringify({ playerIds: [asahi.id, mun.id] }) },
              }],
            },
          }],
        },
      }
    }

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{ message: { role: 'assistant', content: 'Mun is slightly ahead on the returned stats.' } }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'compare him to Mun, who is better?' }],
    memory: { players: [{ id: asahi.id, name: 'Asahi' }], clubs: [], raids: [], students: [] },
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.message, 'Mun is slightly ahead on the returned stats.')
  assert.deepEqual(result.memory.players.map((player) => player.name), ['Mun', 'Asahi'])
  assert.equal(calls, 3)
})

test('agent can answer misspelled upcoming birthday questions with the birthday tool', async () => {
  let calls = 0
  const callModel: ChatCompletionCaller = async (body) => {
    calls += 1

    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        data: {
          model: 'test-tool-model',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call-birthdays',
                type: 'function',
                function: { name: 'get_birthdays', arguments: JSON.stringify({ limit: 5, maxDays: 30 }) },
              }],
            },
          }],
        },
      }
    }

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{ message: { role: 'assistant', content: 'The next upcoming birthday is Hoshino (Swimsuit).' } }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'who is the upcomming birthday student' }],
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.message, 'The next upcoming birthday is Hoshino (Swimsuit).')
  assert.equal(calls, 2)
})

test('agent preloads birthday data so simple birthday questions can finish in one model call', async () => {
  let calls = 0
  const callModel: ChatCompletionCaller = async (body) => {
    calls += 1
    assert.match(JSON.stringify(body.messages), /Preloaded public birthday data/)
    assert.match(JSON.stringify(body.messages), /Hoshino/)

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{ message: { role: 'assistant', content: 'The next upcoming birthday is Hoshino (Swimsuit).' } }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'can you tell me who is the next upcomming birthday' }],
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.message, 'The next upcoming birthday is Hoshino (Swimsuit).')
  assert.equal(calls, 1)
})

test('agent uses Plana prompt and parses structured expression metadata', async () => {
  const callModel: ChatCompletionCaller = async (body) => {
    const prompt = JSON.stringify(body.messages)
    assert.match(prompt, /You are Plana/)
    assert.doesNotMatch(prompt, /You are Kei/)
    assert.match(prompt, /expression\\":\\"neutral/)

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({
              text: 'Understood, Sensei. I found the relevant public records.',
              expression: 'friendly',
              expressionIntensity: 0.42,
            }),
          },
        }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'hello' }],
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.message, 'Understood, Sensei. I found the relevant public records.')
  assert.equal(result.expression, 'friendly')
  assert.equal(result.expressionIntensity, 0.42)
})

test('agent carries compact conversation notes through chat memory', async () => {
  const oldNotes = Array.from({ length: 12 }, (_, index) => `Older note ${index + 1}`)
  const callModel: ChatCompletionCaller = async (body) => {
    const prompt = JSON.stringify(body.messages)
    assert.match(prompt, /Older note 1/)
    assert.doesNotMatch(prompt, /Older note 9/)

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({
              text: 'I remember the broader thread, Sensei.',
              expression: 'friendly',
              expressionIntensity: 0.4,
            }),
          },
        }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'do you still remember what we were talking about?' }],
    memory: { players: [], clubs: [], raids: [], students: [], notes: oldNotes },
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.memory.notes.length, 8)
  assert.match(result.memory.notes[0] || '', /do you still remember/)
  assert.match(result.memory.notes[0] || '', /I remember the broader thread/)
})

test('agent includes Plana knowledge base for self-knowledge questions', async () => {
  let sawKnowledgePrompt = false
  const callModel: ChatCompletionCaller = async (body) => {
    const prompt = JSON.stringify(body.messages)
    assert.match(prompt, /originally A\.R\.O\.N\.A/)
    assert.match(prompt, /Arona-senpai/)
    assert.match(prompt, /Phrenapates/)
    assert.match(prompt, /Plana is not omniscient/)
    assert.match(prompt, /Use tools for public site data/)
    sawKnowledgePrompt = true

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({
              text: 'I am Plana, an AI assistant residing in the Shittim Chest. I support Sensei together with Arona-senpai.',
              expression: 'neutral',
              expressionIntensity: 0.35,
            }),
          },
        }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'Plana, who are you?' }],
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(sawKnowledgePrompt, true)
  assert.match(result.message, /Shittim Chest/)
  assert.equal(result.expression, 'neutral')
  assert.equal(result.expressionIntensity, 0.35)
})

test('agent infers a non-neutral expression when the model stays neutral on clear emotional prompts', async () => {
  const achievement = await runChatAgent({
    messages: [{ role: 'user', content: 'Plana, I finally reached rank 1 after trying for so long!' }],
    model: 'test-tool-model',
    callModel: async () => ({
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({
              text: 'Congratulations, Sensei. That is a meaningful achievement.',
              expression: 'neutral',
              expressionIntensity: 0.3,
            }),
          },
        }],
      },
    }),
    loaders: baseLoaders,
  })

  assert.equal(achievement.expression, 'excited')
  assert.equal(achievement.expressionIntensity, 0.62)

  const irreversible = await runChatAgent({
    messages: [{ role: 'user', content: 'Plana, should I delete this production data permanently?' }],
    model: 'test-tool-model',
    callModel: async () => ({
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({
              text: 'Please pause, Sensei. This action should be reviewed first.',
              expression: 'neutral',
              expressionIntensity: 0.3,
            }),
          },
        }],
      },
    }),
    loaders: baseLoaders,
  })

  assert.equal(irreversible.expression, 'serious')
  assert.equal(irreversible.expressionIntensity, 0.58)
})

test('agent falls back to neutral expression for invalid or plain text model output', async () => {
  const invalidExpression = await runChatAgent({
    messages: [{ role: 'user', content: 'tell me something funny' }],
    model: 'test-tool-model',
    callModel: async () => ({
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{
          message: {
            role: 'assistant',
            content: JSON.stringify({ text: 'The current queue is already ambitious, Sensei.', expression: 'deadpan' }),
          },
        }],
      },
    }),
    loaders: baseLoaders,
  })

  assert.equal(invalidExpression.message, 'The current queue is already ambitious, Sensei.')
  assert.equal(invalidExpression.expression, 'neutral')
  assert.equal(invalidExpression.expressionIntensity, 0.3)

  const plainText = await runChatAgent({
    messages: [{ role: 'user', content: 'summarize the leaderboard' }],
    model: 'test-tool-model',
    callModel: async () => ({
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{ message: { role: 'assistant', content: 'Here is the summary from the gathered stats.' } }],
      },
    }),
    loaders: baseLoaders,
  })

  assert.equal(plainText.message, 'Here is the summary from the gathered stats.')
  assert.equal(plainText.expression, 'neutral')
  assert.equal(plainText.expressionIntensity, 0.3)
})

test('local fallback answers birthday questions without another model request', async () => {
  const result = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'can you tell me who is the next upcomming birthday' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })

  assert.ok(result)
  assert.match(result.message, /Hoshino \(Swimsuit\)/)
  assert.match(result.model, /local-fallback/)
  assert.equal(result.expression, 'neutral')
  assert.equal(result.expressionIntensity, 0.3)
  assert.doesNotMatch(result.message, /Kei/)
})

test('local fallback covers common public website data categories', async () => {
  const player = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'show player profile Asahi' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(player?.message || '', /Asahi/)
  assert.match(player?.message || '', /Total score/)

  const comparison = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'compare him to Mun, who is better?' }],
    memory: { players: [{ id: asahi.id, name: 'Asahi' }], clubs: [], raids: [], students: [] },
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(comparison?.message || '', /Mun/)
  assert.match(comparison?.message || '', /total/i)

  const club = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'SlackerInc club profile' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(club?.message || '', /SlackerInc/)

  const raid = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'top entries for Binah' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(raid?.message || '', /Top public entries/)

  const stats = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'top leaderboard stats' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(stats?.message || '', /Top players/)

  const student = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'student Yuuka' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.match(student?.message || '', /Yuuka/)

  const site = await answerLocalChatFallback({
    messages: [{ role: 'user', content: 'where is the discord link?' }],
    model: 'gemma-4-31b-it:free',
    loaders: baseLoaders,
  })
  assert.ok(site?.message)
})

test('agent stops tool loops and forces a final answer', async () => {
  let calls = 0
  const callModel: ChatCompletionCaller = async (body) => {
    calls += 1
    if (body.tools) {
      return {
        ok: true,
        status: 200,
        data: {
          model: 'test-tool-model',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: `call-stats-${calls}`,
                type: 'function',
                function: { name: 'get_stats_overview', arguments: '{}' },
              }],
            },
          }],
        },
      }
    }

    return {
      ok: true,
      status: 200,
      data: {
        model: 'test-tool-model',
        choices: [{ message: { role: 'assistant', content: 'Here is the summary from the gathered stats.' } }],
      },
    }
  }

  const result = await runChatAgent({
    messages: [{ role: 'user', content: 'summarize the leaderboard' }],
    model: 'test-tool-model',
    callModel,
    loaders: baseLoaders,
  })

  assert.equal(result.message, 'Here is the summary from the gathered stats.')
  assert.equal(calls, 5)
})
