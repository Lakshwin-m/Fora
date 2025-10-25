import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCapsules } from "@/contexts/CapsuleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  Calendar,
  Users,
  Image,
  Video,
  Mic,
  X,
  Plus,
  Send,
  ArrowLeft,
  Loader2,
  User,
  UserPlus,
} from "lucide-react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFriends, type FriendWithProfile } from "@/services/friendServices";

const CreateCapsule = () => {
  const navigate = useNavigate();
  const { addCapsule } = useCapsules();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [triggerType, setTriggerType] = useState<
    "time" | "event" | "connection"
  >("time");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  // Recipient management
  const [recipientType, setRecipientType] = useState<"self" | "friends">(
    "self"
  );
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState("");

  const auth = getAuth();
  const db = getFirestore();

  // Get current user and their username
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);

        // Fetch username from Firestore users collection
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(
              userData.name || userData.username || user.email || "Anonymous"
            );
          } else {
            setUsername(user.email || "Anonymous");
          }
        } catch (error) {
          console.error("Error fetching username:", error);
          setUsername(user.email || "Anonymous");
        }
      } else {
        // Redirect to login if not authenticated
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  // Load friends when switching to friends tab
  useEffect(() => {
    if (recipientType === "friends" && currentUser && friends.length === 0) {
      loadFriends();
    }
  }, [recipientType, currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;

    setLoadingFriends(true);
    try {
      const friendsList = await getFriends(currentUser.uid);
      setFriends(friendsList);

      if (friendsList.length === 0) {
        toast({
          title: "No friends yet",
          description:
            "Add friends from the Connections page to send them capsules.",
        });
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      toast({
        title: "Error",
        description: "Failed to load friends list",
        variant: "destructive",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectAllFriends = () => {
    if (selectedFriends.length === friends.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(
        friends.map((f) =>
          f.requesterId === currentUser.uid ? f.receiverId : f.requesterId
        )
      );
    }
  };

  const handleAddAttachment = (type: string) => {
    setAttachments([...attachments, `${type}-attachment-${Date.now()}`]);
    toast({
      title: "Attachment added",
      description: `${type} attachment has been added to your capsule.`,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a capsule.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return;
    }

    // Validate recipients based on type
    if (recipientType === "friends" && selectedFriends.length === 0) {
      toast({
        title: "No recipients selected",
        description:
          "Please select at least one friend to receive this capsule.",
        variant: "destructive",
      });
      return;
    }

    // Validate time-based trigger has required fields
    if (triggerType === "time" && (!deliveryDate || !deliveryTime)) {
      toast({
        title: "Missing delivery time",
        description:
          "Please specify both date and time for time-based capsules.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate unlock timestamp
      let unlockTimestamp;

      if (triggerType === "time") {
        const dateTimeString = `${deliveryDate}T${deliveryTime}:00`;
        const unlockDate = new Date(dateTimeString);

        if (unlockDate <= new Date()) {
          toast({
            title: "Invalid date",
            description: "Please select a date and time in the future.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        unlockTimestamp = unlockDate;
      } else {
        unlockTimestamp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Determine recipients array
      const recipientsList =
        recipientType === "self" ? [currentUser.uid] : selectedFriends;

      // Get recipient names for display
      const recipientNames =
        recipientType === "self"
          ? ["Myself"]
          : friends
              .filter((f) => {
                const friendId =
                  f.requesterId === currentUser.uid
                    ? f.receiverId
                    : f.requesterId;
                return selectedFriends.includes(friendId);
              })
              .map((f) => f.profile.name);

      // Create capsule document in Firestore
      const capsuleData = {
        title: title.trim(),
        content: content.trim(),
        triggerType: triggerType,
        unlockDate: unlockTimestamp,
        recipients: recipientsList,
        recipientNames: recipientNames,
        recipientType: recipientType, // Make sure this is set correctly
        attachments: attachments,
        userId: currentUser.uid,
        username: username,
        createdAt: serverTimestamp(),
        status: "scheduled",
        isUnlocked: false,
        ...(triggerType === "event" && {
          eventDescription:
            document.getElementById("eventTrigger")?.value || "",
        }),
        ...(triggerType === "connection" && {
          connectionCondition:
            document.getElementById("connectionTrigger")?.value || "",
        }),
      };

      console.log("Creating capsule with recipientType:", recipientType); // Debug log

      // Add to Firestore
      const docRef = await addDoc(collection(db, "capsules"), capsuleData);

      // Also add to local context
      addCapsule({
        id: docRef.id,
        title: title.trim(),
        content: content.trim(),
        deliveryDate: unlockTimestamp.toISOString(),
        recipients: recipientsList,
        triggerType: triggerType,
        attachments: attachments,
      });

      toast({
        title: "Capsule created! 🎉",
        description:
          recipientType === "self"
            ? `Your time capsule will unlock on ${unlockTimestamp.toLocaleString()}`
            : `Capsule will be sent to ${selectedFriends.length} friend${
                selectedFriends.length > 1 ? "s" : ""
              } on ${unlockTimestamp.toLocaleString()}`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating capsule:", error);
      toast({
        title: "Error",
        description: "Failed to create capsule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerOptions = [
    {
      id: "time",
      label: "Time-based",
      description: "Unlock on a specific date and time",
      icon: Clock,
    },
    {
      id: "event",
      label: "Event-based",
      description: "Unlock after a specific event occurs",
      icon: Calendar,
    },
    {
      id: "connection",
      label: "Connection-based",
      description: "Unlock when tagged connection confirms",
      icon: Users,
    },
  ];

  // Show loading while checking auth
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Create Time Capsule
              </h1>
              <p className="text-muted-foreground">
                Craft a message for the future as {username}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Give your capsule a title and content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Capsule Title</Label>
                <Input
                  id="title"
                  placeholder="What's this capsule about?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-border bg-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your message to the future..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-32 border-border bg-input"
                  required
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAttachment("Image")}
                    className="border-border"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAttachment("Video")}
                    className="border-border"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAttachment("Voice")}
                    className="border-border"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Voice Note
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        {attachment}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-destructive/20"
                          onClick={() =>
                            setAttachments(
                              attachments.filter((_, i) => i !== index)
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trigger Configuration */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <span>Unlock Trigger</span>
              </CardTitle>
              <CardDescription>
                Choose when this capsule should be unlocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={triggerType}
                onValueChange={(value) => setTriggerType(value as any)}
              >
                <TabsList className="grid w-full grid-cols-3 bg-muted/20">
                  {triggerOptions.map((option) => (
                    <TabsTrigger
                      key={option.id}
                      value={option.id}
                      className="text-sm"
                    >
                      <option.icon className="w-4 h-4 mr-2" />
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="time" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    Your capsule will unlock automatically on the specified date
                    and time.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="border-border bg-input"
                        min={new Date().toISOString().split("T")[0]}
                        required={triggerType === "time"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime">Delivery Time</Label>
                      <Input
                        id="deliveryTime"
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="border-border bg-input"
                        required={triggerType === "time"}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="event" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    Your capsule will unlock when a specific event occurs.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="eventTrigger">Event Description</Label>
                    <Input
                      id="eventTrigger"
                      placeholder="e.g., My 30th birthday, Sarah's graduation"
                      className="border-border bg-input"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="connection" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    Your capsule will unlock when tagged connections confirm.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="connectionTrigger">Trigger Condition</Label>
                    <Input
                      id="connectionTrigger"
                      placeholder="e.g., We meet again in person"
                      className="border-border bg-input"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <span>Recipients</span>
              </CardTitle>
              <CardDescription>
                Choose who will receive this capsule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={recipientType}
                onValueChange={(value) => setRecipientType(value as any)}
              >
                <TabsList className="grid w-full grid-cols-2 bg-muted/20">
                  <TabsTrigger value="self">
                    <User className="w-4 h-4 mr-2" />
                    Send to Myself
                  </TabsTrigger>
                  <TabsTrigger value="friends">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send to Friends
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="self" className="mt-6">
                  <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                    <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground mb-2">
                      Send to Yourself
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This capsule will be delivered to your own inbox. Perfect
                      for future self-reflections and personal messages.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="friends" className="mt-6 space-y-4">
                  {loadingFriends ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                      <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground mb-2">
                        No Friends Yet
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add friends from the Connections page to send them
                        capsules
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/connections")}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friends
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>
                          Select Friends ({selectedFriends.length} selected)
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectAllFriends}
                        >
                          {selectedFriends.length === friends.length
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                        {friends.map((friend) => {
                          const friendId =
                            friend.requesterId === currentUser.uid
                              ? friend.receiverId
                              : friend.requesterId;
                          const isSelected = selectedFriends.includes(friendId);

                          return (
                            <Card
                              key={friend.id}
                              className={`border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <CardContent
                                className="p-4"
                                onClick={() => toggleFriendSelection(friendId)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        toggleFriendSelection(friendId)
                                      }
                                      className="mt-0.5"
                                    />
                                  </div>
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage
                                      src={friend.profile.photoURL}
                                      alt={friend.profile.name}
                                    />
                                    <AvatarFallback className="bg-gradient-primary text-white">
                                      {getInitials(friend.profile.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground truncate">
                                      {friend.profile.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {friend.profile.email}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="border-border"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Schedule Capsule
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCapsule;
