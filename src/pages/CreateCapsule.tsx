import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapsules } from '@/contexts/CapsuleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navigation from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { 
  Clock, 
  Calendar, 
  Users, 
  Upload, 
  Image, 
  Video, 
  Mic,
  X,
  Plus,
  Send,
  ArrowLeft
} from 'lucide-react';

const CreateCapsule = () => {
  const navigate = useNavigate();
  const { addCapsule } = useCapsules();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [triggerType, setTriggerType] = useState<'time' | 'event' | 'connection'>('time');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleAddRecipient = () => {
    if (newRecipient.trim() && !recipients.includes(newRecipient.trim())) {
      setRecipients([...recipients, newRecipient.trim()]);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (recipient: string) => {
    setRecipients(recipients.filter(r => r !== recipient));
  };

  const handleAddAttachment = (type: string) => {
    setAttachments([...attachments, `${type}-attachment-${Date.now()}`]);
    toast({
      title: "Attachment added",
      description: `${type} attachment has been added to your capsule.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || recipients.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    // Create delivery date based on trigger type
    let finalDeliveryDate = '';
    if (triggerType === 'time' && deliveryDate && deliveryTime) {
      finalDeliveryDate = `${deliveryDate}T${deliveryTime}:00Z`;
    } else {
      // For event/connection based, set a future date as placeholder
      finalDeliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Save the capsule
    addCapsule({
      title: title.trim(),
      content: content.trim(),
      deliveryDate: finalDeliveryDate,
      recipients: recipients,
      triggerType: triggerType,
      attachments: attachments,
    });

    toast({
      title: "Capsule created!",
      description: "Your time capsule has been scheduled successfully.",
    });
    
    navigate('/dashboard');
  };

  const triggerOptions = [
    {
      id: 'time',
      label: 'Time-based',
      description: 'Unlock on a specific date and time',
      icon: Clock,
    },
    {
      id: 'event',
      label: 'Event-based',
      description: 'Unlock after a specific event occurs',
      icon: Calendar,
    },
    {
      id: 'connection',
      label: 'Connection-based',
      description: 'Unlock when tagged connection confirms',
      icon: Users,
    },
  ];

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
              onClick={() => navigate('/dashboard')}
              className="hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Time Capsule</h1>
              <p className="text-muted-foreground">Craft a message for the future</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>Give your capsule a title and content</CardDescription>
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
                <Label>Attachments</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddAttachment('Image')}
                    className="border-border"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddAttachment('Video')}
                    className="border-border"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddAttachment('Voice')}
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
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
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
                <div className="w-6 h-6 bg-gradient-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <span>Unlock Trigger</span>
              </CardTitle>
              <CardDescription>Choose when this capsule should be unlocked</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={triggerType} onValueChange={(value) => setTriggerType(value as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-muted/20">
                  {triggerOptions.map((option) => (
                    <TabsTrigger key={option.id} value={option.id} className="text-sm">
                      <option.icon className="w-4 h-4 mr-2" />
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="time" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    Your capsule will unlock automatically on the specified date and time.
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
                        required
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
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="event" className="space-y-4 mt-6">
                  <p className="text-sm text-muted-foreground">
                    Your capsule will unlock when a specific event occurs (e.g., birthday, graduation).
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
                    Your capsule will unlock when tagged connections confirm the trigger condition.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="connectionTrigger">Trigger Condition</Label>
                    <Input
                      id="connectionTrigger"
                      placeholder="e.g., We meet again in person, Project completion"
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
                <div className="w-6 h-6 bg-gradient-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <span>Recipients</span>
              </CardTitle>
              <CardDescription>Choose who will receive this capsule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter email or username"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                  className="flex-1 border-border bg-input"
                />
                <Button 
                  type="button" 
                  onClick={handleAddRecipient}
                  variant="outline"
                  className="border-border"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {recipients.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Recipients ({recipients.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {recipients.map((recipient, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        {recipient}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2 hover:bg-destructive/20"
                          onClick={() => handleRemoveRecipient(recipient)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="border-border"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover-glow shadow-glow"
            >
              <Send className="w-4 h-4 mr-2" />
              Schedule Capsule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCapsule;