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
  Check,
  X,
  Users,
  Clock,
  MoreHorizontal,
  UserMinus,
  Loader2,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Send,
  Mail,
  Filter,
  ChevronRight,
  Plus,
  Shield,
  Eye,
  MessageCircle,
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
  DropdownMenuSeparator,
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
  const [activeTab, setActiveTab] = useState("connections");

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
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-[#FFDCCC] border-t-[#FB6376] rounded-full animate-spin"></div>
              </div>
              <p className="text-[#5D2A42]/60">Loading your network...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Minimal Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mb-6 text-[#5D2A42] hover:bg-[#FFF9EC] hover:text-[#5D2A42]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="flex items-baseline space-x-4">
                <h1 className="text-4xl font-bold text-[#5D2A42]">
                  Connections
                </h1>
                <Badge className="bg-[#FFF9EC] text-[#5D2A42] border border-[#5D2A42]/20">
                  {friends.length} people
                </Badge>
              </div>
              <p className="text-[#5D2A42]/60 mt-2">
                Manage your personal and professional network
              </p>
            </div>
            <Button
              onClick={() => setActiveTab("suggestions")}
              variant="outline"
              className="border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFF9EC] hover:border-[#5D2A42]/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Discover
            </Button>
          </div>

          {/* Modern Search */}
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[#5D2A42]/40" />
            </div>
            <Input
              type="text"
              placeholder="Search connections by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#5D2A42]/20 bg-white h-12 text-lg placeholder:text-[#5D2A42]/40 focus:border-[#FB6376] focus:ring-1 focus:ring-[#FB6376]/20"
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content - 70% width */}
          <div className="lg:w-3/4">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF9EC] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#FB6376]" />
                  </div>
                  <h2 className="text-2xl font-semibold text-[#5D2A42]">
                    Your Network
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#5D2A42] hover:bg-[#FFF9EC]"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </div>
              </div>

              {/* Connections Grid */}
              {filteredConnections.length === 0 ? (
                <Card className="border-[#5D2A42]/10">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#FFF9EC] rounded-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-[#5D2A42]/30" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#5D2A42] mb-3">
                      Your network is empty
                    </h3>
                    <p className="text-[#5D2A42]/60 mb-6">
                      Start connecting with people to build your network
                    </p>
                    <Button
                      onClick={() => setActiveTab("suggestions")}
                      className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Find People
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredConnections.map((friend) => (
                    <Card
                      key={friend.id}
                      className="border-[#5D2A42]/10 hover:border-[#5D2A42]/20 transition-all duration-200 group hover:shadow-sm"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12 border border-[#5D2A42]/10">
                                <AvatarImage
                                  src={friend.profile.photoURL}
                                  alt={friend.profile.name}
                                />
                                <AvatarFallback className="bg-[#FFF9EC] text-[#5D2A42]">
                                  {getInitials(friend.profile.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">
                                {friend.profile.name}
                              </h4>
                              <p className="text-xs text-[#5D2A42]/60 mt-1">
                                {friend.profile.connections} connections
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FFF9EC] text-[#5D2A42]"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 border-[#5D2A42]/10 bg-white"
                            >
                              <DropdownMenuItem className="text-[#5D2A42] hover:bg-[#FFF9EC]">
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-[#5D2A42] hover:bg-[#FFF9EC]">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#5D2A42]/10" />
                              <DropdownMenuItem
                                className="text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  handleRemoveFriend(
                                    friend.id!,
                                    friend.profile.name
                                  )
                                }
                                disabled={actionLoading === friend.id}
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {friend.profile.bio && (
                          <p className="text-sm text-[#5D2A42]/60 line-clamp-2 mb-4">
                            {friend.profile.bio}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#5D2A42]/40">
                            {friend.profile.email}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-[#FB6376] hover:text-[#FB6376]/80 hover:bg-[#FFF9EC]"
                          >
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Section */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF9EC] flex items-center justify-center">
                    <Plus className="w-4 h-4 text-[#FB6376]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#5D2A42]">
                    Quick Add
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadSuggestions}
                  className="text-[#5D2A42] hover:bg-[#FFF9EC]"
                >
                  Refresh
                </Button>
              </div>

              {/* Suggestions Carousel */}
              {suggestions.friendsOfFriends.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {suggestions.friendsOfFriends.slice(0, 3).map((user) => (
                    <Card
                      key={user.uid}
                      className="border-[#5D2A42]/10 hover:border-[#5D2A42]/20 transition-all duration-200"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage
                                src={user.photoURL}
                                alt={user.name}
                              />
                              <AvatarFallback className="bg-[#FCB1A6] text-[#5D2A42]">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-[#5D2A42]">
                                {user.name}
                              </h4>
                              <p className="text-xs text-[#5D2A42]/60">
                                {user.mutualFriends} mutual
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
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                        {user.bio && (
                          <p className="text-sm text-[#5D2A42]/60 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side Panel - 30% width */}
          <div className="lg:w-1/4 space-y-8">
            {/* Add Connection Card */}
            <Card className="border-[#5D2A42]/10 sticky top-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#5D2A42]">
                  Add Connection
                </CardTitle>
                <CardDescription className="text-[#5D2A42]/60">
                  Connect with new people
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-[#5D2A42]">
                    Email address
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearchUsers()
                      }
                      className="border-[#5D2A42]/20"
                    />
                    <Button
                      onClick={handleSearchUsers}
                      disabled={searchLoading || !inviteEmail.trim()}
                      size="icon"
                      className="bg-[#FB6376] hover:bg-[#FB6376]/90 text-white"
                    >
                      {searchLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveTab("suggestions")}
                  variant="outline"
                  className="w-full border-[#5D2A42]/20 text-[#5D2A42] hover:bg-[#FFF9EC]"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Discover Suggestions
                </Button>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card className="border-[#5D2A42]/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#5D2A42]">
                    Pending
                  </CardTitle>
                  {allPendingRequests.length > 0 && (
                    <Badge className="bg-[#FCB1A6] text-[#5D2A42]">
                      {allPendingRequests.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {allPendingRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <Clock className="w-8 h-8 text-[#5D2A42]/20 mx-auto mb-2" />
                    <p className="text-sm text-[#5D2A42]/60">
                      No pending requests
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-[#FFF9EC] transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={request.profile.photoURL}
                              alt={request.profile.name}
                            />
                            <AvatarFallback className="bg-[#FCB1A6] text-[#5D2A42] text-xs">
                              {getInitials(request.profile.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#5D2A42] truncate">
                              {request.profile.name}
                            </p>
                            <p className="text-xs text-[#5D2A42]/60">
                              Incoming
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              handleRejectRequest(
                                request.id!,
                                request.profile.name
                              )
                            }
                            disabled={actionLoading === request.id}
                            className="h-8 w-8 hover:bg-red-50 text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              handleAcceptRequest(
                                request.id!,
                                request.profile.name
                              )
                            }
                            disabled={actionLoading === request.id}
                            className="h-8 w-8 hover:bg-green-50 text-green-600"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {sentRequests.slice(0, 2).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-[#FFF9EC] transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={request.profile.photoURL}
                              alt={request.profile.name}
                            />
                            <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xs">
                              {getInitials(request.profile.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#5D2A42] truncate">
                              {request.profile.name}
                            </p>
                            <p className="text-xs text-[#5D2A42]/60">Sent</p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleCancelRequest(
                              request.id!,
                              request.profile.name
                            )
                          }
                          disabled={actionLoading === request.id}
                          className="h-8 w-8 hover:bg-[#FFF9EC] text-[#5D2A42]"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {(receivedRequests.length > 3 ||
                      sentRequests.length > 2) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("pending")}
                        className="w-full text-[#5D2A42] hover:bg-[#FFF9EC]"
                      >
                        View all requests
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Note */}
            <Card className="border-[#5D2A42]/10 bg-[#FFF9EC]/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#5D2A42]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5D2A42] mb-1">
                      Your privacy matters
                    </p>
                    <p className="text-xs text-[#5D2A42]/60">
                      Only share capsules with trusted connections
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
