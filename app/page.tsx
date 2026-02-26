"use client"

import { useEffect, useState } from "react"
import { Trophy, Medal, RefreshCw, Users, Target, TrendingUp } from "lucide-react"

interface Player {
  user_id: number
  username: string
  score: number
  rank?: number
}

const API_URL = "https://colorguesser-production.up.railway.app"

export default function RatingPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/leaderboard`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Не удалось загрузить данные")
      }
      const data = await response.json()
      setPlayers(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    totalPlayers: players.length,
    topScore: players.length > 0 ? Math.max(...players.map((p) => p.score)) : 0,
    avgScore: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length) : 0,
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50"
    if (index === 1) return "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/50"
    if (index === 2) return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50"
    return "bg-[hsl(var(--card))] border-[hsl(var(--border))]"
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400" />
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">{index + 1}</span>
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Color Guesser
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">Таблица лидеров</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 text-center border border-[hsl(var(--border))]">
            <Users className="w-5 h-5 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Игроков</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 text-center border border-[hsl(var(--border))]">
            <Target className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{stats.topScore}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Лучший счёт</div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 text-center border border-[hsl(var(--border))]">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold">{stats.avgScore}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Средний</div>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {lastUpdated && `Обновлено: ${lastUpdated.toLocaleTimeString("ru-RU")}`}
          </span>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>

        {/* Leaderboard */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          {loading && players.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-400" />
              <p className="text-[hsl(var(--muted-foreground))]">Загрузка рейтинга...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm"
              >
                Попробовать снова
              </button>
            </div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
              <p className="text-[hsl(var(--muted-foreground))]">Пока нет игроков</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {players.map((player, index) => (
                <div
                  key={player.user_id}
                  className={`flex items-center gap-4 p-4 border-l-4 ${getRankStyle(index)}`}
                >
                  <div className="w-8 flex justify-center">{getRankIcon(index)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.username || `Игрок ${player.user_id}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-purple-400">{player.score}</span>
                    <span className="text-sm text-[hsl(var(--muted-foreground))] ml-1">очков</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
          Автообновление каждые 30 секунд
        </p>
      </div>
    </main>
  )
}
