import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="pt-6 text-center">
          <h2 className="text-2xl font-bold mb-4">404 - Page Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The page you are looking for does not exist.
          </p>
          <Button asChild>
            <Link to="/workflow/scan">
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
