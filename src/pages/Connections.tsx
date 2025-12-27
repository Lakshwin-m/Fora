import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  UserPlus,
  Search,
  Mail,
  Check,
  X,
  Users,
  Clock,
  MessageCircle,
  MoreHorizontal,
  UserMinus,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriends,
  getReceivedFriendRequests,
  getSentFriendRequests,
  searchUsers,
  getFriendSuggestions,
  FriendWithProfile,
  UserProfile,
} from "@/services/friendServices";
import { auth } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const Connections = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // State for data
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendWithProfile[]>(
    []
  );
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<{
    friendsOfFriends: UserProfile[];
    popularUsers: UserProfile[];
  }>({ friendsOfFriends: [], popularUsers: [] });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  // Load initial data
  useEffect(() => {
    if (currentUserId) {
      loadAllData();
    }
  }, [currentUserId]);

  const loadAllData = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const [friendsData, receivedData, sentData] = await Promise.all([
        getFriends(currentUserId),
        getReceivedFriendRequests(currentUserId),
        getSentFriendRequests(currentUserId),
      ]);

      setFriends(friendsData);
      setReceivedRequests(receivedData);
      setSentRequests(sentData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load connections data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!currentUserId || !inviteEmail.trim()) return;

    setSearchLoading(true);
    try {
      const results = await searchUsers(inviteEmail.trim(), currentUserId);
      setSearchResults(results);

      if (results.length === 0) {
        toast({
          title: "No users found",
          description: "Try searching with a different name or email",
        });
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!currentUserId) return;

    setLoadingSuggestions(true);
    try {
      const suggestionsData = await getFriendSuggestions(currentUserId);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to load friend suggestions",
        variant: "destructive",
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!currentUserId) return;

    setActionLoading(receiverId);
    try {
      const result = await sendFriendRequest(currentUserId, receiverId);

      if (result.success) {
        toast({
          title: "Request sent!",
          description: result.message,
        });
        setInviteEmail("");
        setSearchResults([]);
        // Refresh suggestions to remove the user we just sent a request to
        if (
          suggestions.friendsOfFriends.length > 0 ||
          suggestions.popularUsers.length > 0
        ) {
          loadSuggestions();
        }
        await loadAllData();
      } else {
        toast({
          title: "Unable to send request",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (requestId: string, name: string) => {
    if (!currentUserId) return;

    setActionLoading(requestId);
    try {
      const result = await acceptFriendRequest(requestId, currentUserId);

      if (result.success) {
        toast({
          title: "Connection accepted!",
          description: `You're now connected with ${name}`,
        });
        await loadAllData();
      } else {
        toast({
          title: "Unable to accept",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string, name: string) => {
    if (!currentUserId) return;

    setActionLoading(requestId);
    try {
      const result = await rejectFriendRequest(requestId, currentUserId);

      if (result.success) {
        toast({
          title: "Request declined",
          description: `Connection request from ${name} has been declined`,
        });
        await loadAllData();
      } else {
        toast({
          title: "Unable to reject",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: string, name: string) => {
    if (!currentUserId) return;

    setActionLoading(requestId);
    try {
      const result = await cancelFriendRequest(requestId, currentUserId);

      if (result.success) {
        toast({
          title: "Request cancelled",
          description: `Friend request to ${name} has been cancelled`,
        });
        await loadAllData();
      } else {
        toast({
          title: "Unable to cancel",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    if (!currentUserId) return;

    setActionLoading(friendshipId);
    try {
      const result = await removeFriend(friendshipId, currentUserId);

      if (result.success) {
        toast({
          title: "Friend removed",
          description: `${name} has been removed from your connections`,
        });
        await loadAllData();
      } else {
        toast({
          title: "Unable to remove",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const filteredConnections = friends.filter(
    (friend) =>
      friend.profile &&
      (friend.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.profile.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const allPendingRequests = [...receivedRequests, ...sentRequests];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-[#FFDCCC]/50 text-[#5D2A42] border border-[#5D2A42]/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#5D2A42]">Connections</h1>
              <p className="text-[#5D2A42]/60">
                Manage your network and share time capsules with friends and
                family
              </p>
            </div>
          </div>
        </div>

        {/* Invite Section */}
        <Card className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200 mb-8">
          <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
            <CardTitle className="flex items-center space-x-3 text-[#5D2A42]">
              <div className="w-10 h-10 bg-[#FB6376] rounded-xl flex items-center justify-center shadow-sm">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold">Find & Connect</div>
                <CardDescription className="text-[#5D2A42]/70">
                  Search for users by name or email to send connection requests
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            <div className="flex space-x-3">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="invite-email"
                  className="text-[#5D2A42] font-medium"
                >
                  Name or Email
                </Label>
                <Input
                  id="invite-email"
                  type="text"
                  placeholder="Search by name or email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                  className="border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearchUsers}
                  disabled={searchLoading || !inviteEmail.trim()}
                  className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-[#5D2A42]">
                  Search Results ({searchResults.length})
                </p>
                {searchResults.map((user) => (
                  <Card
                    key={user.uid}
                    className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-md transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.photoURL} alt={user.name} />
                            <AvatarFallback className="bg-[#FB6376] text-white">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-[#5D2A42]">
                              {user.name}
                            </h4>
                            <p className="text-sm text-[#5D2A42]/60">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSendRequest(user.uid)}
                          disabled={actionLoading === user.uid}
                          className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                        >
                          {actionLoading === user.uid ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4 mr-2" />
                          )}
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connections Tabs */}
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full md:w-fit grid-cols-3 mb-8 bg-white border border-[#5D2A42]/20 p-1 shadow-sm">
            <TabsTrigger
              value="connections"
              className="data-[state=active]:bg-[#FB6376] data-[state=active]:text-white text-[#5D2A42]"
            >
              My Connections
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-[#FCB1A6] data-[state=active]:text-[#5D2A42] text-[#5D2A42]"
            >
              Pending
              {allPendingRequests.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-[#FB6376] text-white">
                  {allPendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              onClick={loadSuggestions}
              className="data-[state=active]:bg-[#FFDCCC] data-[state=active]:text-[#5D2A42] text-[#5D2A42]"
            >
              Suggestions
            </TabsTrigger>
          </TabsList>

          {/* My Connections */}
          <TabsContent value="connections" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5D2A42]/60" />
                <Input
                  placeholder="Search connections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#5D2A42]/20 bg-[#FFF9EC] focus:border-[#FB6376] text-[#5D2A42]"
                />
              </div>
            </div>

            {filteredConnections.length === 0 ? (
              <Card className="border-[#5D2A42]/20 bg-[#FFF9EC]">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-[#FFDCCC] rounded-2xl flex items-center justify-center">
                    <Users className="w-10 h-10 text-[#5D2A42]/40" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
                    No connections yet
                  </h3>
                  <p className="text-[#5D2A42]/60 max-w-md mx-auto leading-relaxed">
                    Start by searching for friends above to build your network
                    and share time capsules.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredConnections.map((friend) => (
                  <Card
                    key={friend.id}
                    className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
                  >
                    <CardHeader className="pb-4 bg-[#FFDCCC]/30 border-b border-[#5D2A42]/10">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage
                              src={friend.profile.photoURL}
                              alt={friend.profile.name}
                            />
                            <AvatarFallback className="bg-[#FB6376] text-white">
                              {getInitials(friend.profile.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base font-semibold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">
                              {friend.profile.name}
                            </CardTitle>
                            <p className="text-xs text-[#5D2A42]/60">
                              {friend.profile.email}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#5D2A42] hover:bg-[#FFDCCC]"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="border-[#5D2A42]/20 bg-[#FFF9EC]"
                          >
                            <DropdownMenuItem
                              className="text-[#FB6376] focus:text-[#FB6376] focus:bg-[#FFDCCC]"
                              onClick={() =>
                                handleRemoveFriend(
                                  friend.id!,
                                  friend.profile.name
                                )
                              }
                              disabled={actionLoading === friend.id}
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove Friend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 bg-white">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#5D2A42]/60">
                            Connections:
                          </span>
                          <span className="font-medium text-[#5D2A42]">
                            {friend.profile.connections}
                          </span>
                        </div>
                        {friend.profile.bio && (
                          <p className="text-xs text-[#5D2A42]/60 line-clamp-2 mt-2">
                            {friend.profile.bio}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending" className="space-y-6">
            {allPendingRequests.length === 0 ? (
              <Card className="border-[#5D2A42]/20 bg-[#FFF9EC]">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-[#FFDCCC] rounded-2xl flex items-center justify-center">
                    <Clock className="w-10 h-10 text-[#5D2A42]/40" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
                    No pending requests
                  </h3>
                  <p className="text-[#5D2A42]/60 max-w-md mx-auto leading-relaxed">
                    When you send or receive connection requests, they'll appear
                    here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Received Requests */}
                {receivedRequests.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-[#5D2A42] uppercase tracking-wide">
                      Received Requests ({receivedRequests.length})
                    </h3>
                    {receivedRequests.map((request) => (
                      <Card
                        key={request.id}
                        className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-12 h-12">
                                <AvatarImage
                                  src={request.profile.photoURL}
                                  alt={request.profile.name}
                                />
                                <AvatarFallback className="bg-[#FCB1A6] text-[#5D2A42]">
                                  {getInitials(request.profile.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-semibold text-[#5D2A42]">
                                    {request.profile.name}
                                  </h3>
                                  <Badge className="bg-[#FCB1A6]/30 text-[#5D2A42] border-[#FCB1A6]/40">
                                    Incoming
                                  </Badge>
                                </div>
                                <p className="text-sm text-[#5D2A42]/60 mb-2">
                                  {request.profile.email}
                                </p>
                                {request.profile.bio && (
                                  <p className="text-sm text-[#5D2A42]">
                                    {request.profile.bio}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAcceptRequest(
                                    request.id!,
                                    request.profile.name
                                  )
                                }
                                disabled={actionLoading === request.id}
                                className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                              >
                                {actionLoading === request.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 mr-2" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRejectRequest(
                                    request.id!,
                                    request.profile.name
                                  )
                                }
                                disabled={actionLoading === request.id}
                                className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-[#5D2A42] uppercase tracking-wide mt-8">
                      Sent Requests ({sentRequests.length})
                    </h3>
                    {sentRequests.map((request) => (
                      <Card
                        key={request.id}
                        className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg transition-all duration-200"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-12 h-12">
                                <AvatarImage
                                  src={request.profile.photoURL}
                                  alt={request.profile.name}
                                />
                                <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42]">
                                  {getInitials(request.profile.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="font-semibold text-[#5D2A42]">
                                    {request.profile.name}
                                  </h3>
                                  <Badge className="bg-[#FFDCCC] text-[#5D2A42] border-[#5D2A42]/20">
                                    Sent
                                  </Badge>
                                </div>
                                <p className="text-sm text-[#5D2A42]/60 mb-2">
                                  {request.profile.email}
                                </p>
                                <p className="text-xs text-[#5D2A42]/60">
                                  Sent{" "}
                                  {request.createdAt
                                    .toDate()
                                    .toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleCancelRequest(
                                  request.id!,
                                  request.profile.name
                                )
                              }
                              disabled={actionLoading === request.id}
                              className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFDCCC]"
                            >
                              {actionLoading === request.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <X className="w-4 h-4 mr-2" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#FB6376]" />
              </div>
            ) : (
              <>
                {/* Friends of Friends */}
                {suggestions.friendsOfFriends.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-[#FB6376]" />
                      <h3 className="text-lg font-semibold text-[#5D2A42]">
                        People You May Know
                      </h3>
                    </div>
                    <p className="text-sm text-[#5D2A42]/60">
                      Based on mutual connections
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.friendsOfFriends.map((user) => (
                        <Card
                          key={user.uid}
                          className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg cursor-pointer transition-all duration-200"
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage
                                    src={user.photoURL}
                                    alt={user.name}
                                  />
                                  <AvatarFallback className="bg-[#FCB1A6] text-[#5D2A42]">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-[#5D2A42] truncate">
                                    {user.name}
                                  </h4>
                                  <p className="text-sm text-[#5D2A42]/60 truncate">
                                    {user.email}
                                  </p>
                                  <p className="text-xs text-[#FB6376] font-medium mt-1">
                                    {user.mutualFriends} mutual friend
                                    {user.mutualFriends !== 1 ? "s" : ""}
                                  </p>
                                  {user.bio && (
                                    <p className="text-xs text-[#5D2A42]/60 line-clamp-2 mt-2">
                                      {user.bio}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSendRequest(user.uid)}
                                disabled={actionLoading === user.uid}
                                className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                              >
                                {actionLoading === user.uid ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserPlus className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Users */}
                {suggestions.popularUsers.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-[#FB6376]" />
                      <h3 className="text-lg font-semibold text-[#5D2A42]">
                        Popular on Forá
                      </h3>
                    </div>
                    <p className="text-sm text-[#5D2A42]/60">
                      Users with many connections
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.popularUsers.map((user) => (
                        <Card
                          key={user.uid}
                          className="border-[#5D2A42]/20 bg-[#FFF9EC] hover:shadow-lg cursor-pointer transition-all duration-200"
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage
                                    src={user.photoURL}
                                    alt={user.name}
                                  />
                                  <AvatarFallback className="bg-[#FB6376] text-white">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-[#5D2A42] truncate">
                                    {user.name}
                                  </h4>
                                  <p className="text-sm text-[#5D2A42]/60 truncate">
                                    {user.email}
                                  </p>
                                  <p className="text-xs text-[#5D2A42]/60 mt-1">
                                    {user.connections} connections
                                  </p>
                                  {user.bio && (
                                    <p className="text-xs text-[#5D2A42]/60 line-clamp-2 mt-2">
                                      {user.bio}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSendRequest(user.uid)}
                                disabled={actionLoading === user.uid}
                                className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                              >
                                {actionLoading === user.uid ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserPlus className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {suggestions.friendsOfFriends.length === 0 &&
                  suggestions.popularUsers.length === 0 && (
                    <Card className="border-[#5D2A42]/20 bg-[#FFF9EC]">
                      <CardContent className="p-16 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#FFDCCC] rounded-2xl flex items-center justify-center">
                          <Users className="w-10 h-10 text-[#5D2A42]/40" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#5D2A42] mb-3">
                          No Suggestions Yet
                        </h3>
                        <p className="text-[#5D2A42]/60 max-w-md mx-auto leading-relaxed">
                          Connect with more people to see personalized
                          suggestions
                        </p>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Connections;
