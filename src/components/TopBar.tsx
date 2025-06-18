'use client'

import { Menu, Settings, Users, HelpCircle, Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function TopBar() {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">VideoPresenter Pro</h1>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-sm font-medium">
              Screenshare
            </Button>
            <Button variant="ghost" size="sm" className="text-sm font-medium">
              Media
            </Button>
            <Button variant="ghost" size="sm" className="text-sm font-medium">
              Text
            </Button>
            <Button variant="ghost" size="sm" className="text-sm font-medium">
              GIPHY
            </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                More
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Annotations</DropdownMenuItem>
              <DropdownMenuItem>Shapes</DropdownMenuItem>
              <DropdownMenuItem>Audio</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          </div>
        </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="px-3 py-1">
          Presentations
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              Scratchpad
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              New Presentation
            </DropdownMenuItem>
            <DropdownMenuItem>Recent Presentations</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          Invite
        </Button>
        <Button variant="ghost" size="sm">
          Desktop App
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button variant="ghost" size="icon">
          <Users className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 