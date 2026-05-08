import { PlayerManager } from './components/PlayerManager'
import { CurrentMatch } from './components/CurrentMatch'
import { Leaderboard } from './components/Leaderboard'
import { MatchHistory } from './components/MatchHistory'
import { ResetMenu } from './components/ResetMenu'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏸</span>
            <h1 className="text-lg font-bold text-gray-800">Badminton Randomizer</h1>
          </div>
          <ResetMenu />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <CurrentMatch />
        <PlayerManager />
        <Leaderboard />
        <MatchHistory />
      </main>
    </div>
  )
}

export default App
