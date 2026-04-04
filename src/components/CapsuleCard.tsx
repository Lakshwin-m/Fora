// src/components/CapsuleCard.tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Lock, 
  Unlock, 
  Users, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';

// 🔐 Import decryption hook
import { useCapsuleDecryption } from '@/hooks/useCapsuleDecryption';
import { formatFirebaseDate } from '@/lib/date';

interface CapsuleCardProps {
  capsule: {
    id: string;
    title: string;
    titleIv?: string;
    content: string;
    contentIv?: string;
    unlockDate: string;
    recipients: string[];
    recipientType: string;
    status: string;
    triggerType: string;
    isUnlocked: boolean;
    category?: string;
    createdAt: any;
    userId: string;
    attachments?: any[];
    signature?: string;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CapsuleCard = ({ 
  capsule,
  onView,
  onEdit,
  onDelete
}: CapsuleCardProps) => {
  // 🔐 Decrypt the capsule content
  const { title, content, isDecrypting } = useCapsuleDecryption(capsule);

  const getStatusColor = () => {
    if (capsule.isUnlocked) {
      return 'bg-success/20 text-success border-success/30';
    }
    switch (capsule.status) {
      case 'sealed': return 'bg-warning/20 text-warning border-warning/30';
      case 'delivered': return 'bg-primary/20 text-primary border-primary/30';
      case 'opened': return 'bg-success/20 text-success border-success/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getTriggerIcon = () => {
    switch (capsule.triggerType) {
      case 'time': return <Clock className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'connection': return <Users className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = () => {
    if (capsule.isUnlocked) return 'Opened';
    if (capsule.status === 'sealed') return 'Sealed';
    if (capsule.status === 'delivered') return 'Delivered';
    return 'Waiting';
  };

  const getRecipientLabel = () => {
    switch (capsule.recipientType) {
      case 'self': return 'Only Me';
      case 'friends': return `${capsule.recipients.length} Friend${capsule.recipients.length !== 1 ? 's' : ''}`;
      case 'public': return 'Public';
      default: return `${capsule.recipients.length} Recipient${capsule.recipients.length !== 1 ? 's' : ''}`;
    }
  };

  const isLocked = !capsule.isUnlocked;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card hover-glow transition-smooth group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isLocked ? 'bg-muted/20' : 'bg-success/20'}`}>
            {isLocked ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Unlock className="w-5 h-5 text-success" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* 🔐 Show loading state while decrypting */}
            {isDecrypting ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <h3 className="font-semibold text-lg text-muted-foreground">
                  Decrypting...
                </h3>
              </div>
            ) : (
              <h3 className="font-semibold text-lg text-card-foreground truncate">
                {title || "Untitled Capsule"}
              </h3>
            )}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              {getTriggerIcon()}
              <span className="capitalize">{capsule.triggerType} trigger</span>
              {capsule.category && (
                <>
                  <span>•</span>
                  <span>{capsule.category}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <Badge className={`${getStatusColor()} ml-2 flex-shrink-0`}>
          {getStatusLabel()}
        </Badge>
      </div>

      {/* Content Preview */}
      {isDecrypting ? (
        <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading content...</span>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {isLocked ? '🔒 Content will be revealed when unlocked' : (content || 'No content')}
        </p>
      )}

      {/* Delivery Info */}
      <div className="bg-muted/10 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {capsule.isUnlocked 
                ? `Opened ${formatFirebaseDate(capsule.unlockDate, "PP")}`
                : `Opens ${formatFirebaseDate(capsule.unlockDate, "PP")}`
              }
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {getRecipientLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Recipients - Only show for friends */}
      {capsule.recipientType === 'friends' && capsule.recipients.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {capsule.recipients.slice(0, 3).map((recipient, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {recipient}
            </Badge>
          ))}
          {capsule.recipients.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{capsule.recipients.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="hover:bg-primary/20"
            onClick={() => onView?.(capsule.id)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {!capsule.isUnlocked && capsule.status === 'sealed' && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="hover:bg-accent/20"
              onClick={() => onEdit?.(capsule.id)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        {!capsule.isUnlocked && capsule.status === 'sealed' && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="hover:bg-destructive/20 text-destructive"
            onClick={() => onDelete?.(capsule.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CapsuleCard;