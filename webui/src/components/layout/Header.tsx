import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-background border-b">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-3xl font-bold">
              STOZ - Synology To ZimaOS Migration
            </h1>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/history">
              <History className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
