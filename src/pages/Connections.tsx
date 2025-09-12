import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navigation from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Search, 
  Mail, 
  Check, 
  X, 
  Users, 
  Clock,
  MessageCircle,
  MoreHorizontal
} from 'lucide-react';

const Connections = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Mock data
  const connections = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      avatar: '',
      status: 'connected',
      mutualCapsules: 5,
      lastActive: '2 hours ago',
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      avatar: '',
      status: 'connected',
      mutualCapsules: 3,
      lastActive: '1 day ago',
    },
    {
      id: '3',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      avatar: '',
      status: 'connected',
      mutualCapsules: 8,
      lastActive: '3 hours ago',
    },
  ];

  const pendingRequests = [
    {
      id: '4',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      avatar: '',
      type: 'incoming',
      message: 'Hey! Found you through mutual friends. Would love to share some time capsules!',
    },
    {
      id: '5',
      name: 'David Kim',
      email: 'david@example.com',
      avatar: '',
      type: 'outgoing',
      message: 'Sent a connection request',
    },
  ];

  const suggestions = [
    {
      id: '6',
      name: 'Jessica Park',
      email: 'jessica@example.com',
      avatar: '',
      mutualConnections: 3,
      reason: 'Works at the same company',
    },
    {
      id: '7',
      name: 'Ryan O\'Connor',
      email: 'ryan@example.com',
      avatar: '',
      mutualConnections: 2,
      reason: 'Mutual connections',
    },
  ];

  const handleSendInvite = () => {
    if (inviteEmail.trim()) {
      toast({
        title: "Invitation sent!",
        description: `Connection request sent to ${inviteEmail}`,
      });
      setInviteEmail('');
    }
  };

  const handleAcceptRequest = (name: string) => {
    toast({
      title: "Connection accepted!",
      description: `You're now connected with ${name}`,
    });
  };

  const handleRejectRequest = (name: string) => {
    toast({
      title: "Request declined",
      description: `Connection request from ${name} has been declined`,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Connections</h1>
          <p className="text-muted-foreground">
            Manage your network and share time capsules with friends and family
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Connections
              </CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{connections.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <Clock className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{pendingRequests.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shared Capsules
              </CardTitle>
              <MessageCircle className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {connections.reduce((sum, conn) => sum + conn.mutualCapsules, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Section */}
        <Card className="border-border bg-card/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <span>Invite New Connection</span>
            </CardTitle>
            <CardDescription>
              Send an invitation to connect and share time capsules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-border bg-input"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSendInvite}
                  className="bg-gradient-primary hover-glow"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connections Tabs */}
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full md:w-fit grid-cols-3 mb-6 bg-muted/20">
            <TabsTrigger value="connections">My Connections</TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          {/* My Connections */}
          <TabsContent value="connections" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border bg-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConnections.map((connection) => (
                <Card key={connection.id} className="border-border bg-card/80 backdrop-blur-sm hover-glow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={connection.avatar} alt={connection.name} />
                          <AvatarFallback className="bg-gradient-primary text-white">
                            {getInitials(connection.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">{connection.name}</h3>
                          <p className="text-sm text-muted-foreground">{connection.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shared capsules:</span>
                        <span className="font-medium text-foreground">{connection.mutualCapsules}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last active:</span>
                        <span className="font-medium text-foreground">{connection.lastActive}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending" className="space-y-6">
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-border bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.avatar} alt={request.name} />
                          <AvatarFallback className="bg-gradient-accent text-white">
                            {getInitials(request.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-foreground">{request.name}</h3>
                            <Badge variant={request.type === 'incoming' ? 'default' : 'secondary'}>
                              {request.type === 'incoming' ? 'Incoming' : 'Sent'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{request.email}</p>
                          <p className="text-sm text-foreground">{request.message}</p>
                        </div>
                      </div>
                      
                      {request.type === 'incoming' && (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleAcceptRequest(request.name)}
                            className="bg-gradient-primary hover-glow"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRejectRequest(request.name)}
                            className="border-border hover:bg-destructive/20"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Suggestions */}
          <TabsContent value="suggestions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-border bg-card/80 backdrop-blur-sm hover-glow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={suggestion.avatar} alt={suggestion.name} />
                          <AvatarFallback className="bg-gradient-secondary text-white">
                            {getInitials(suggestion.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{suggestion.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{suggestion.email}</p>
                          <p className="text-sm text-foreground">{suggestion.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.mutualConnections} mutual connections
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-gradient-accent hover-glow">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Connections;