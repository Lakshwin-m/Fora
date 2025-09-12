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
  Trash2
} from 'lucide-react';

interface CapsuleCardProps {
  title: string;
  content: string;
  deliveryDate: string;
  recipients: string[];
  status: 'scheduled' | 'delivered' | 'opened';
  triggerType: 'time' | 'event' | 'connection';
  id: string;
}

const CapsuleCard = ({ 
  title, 
  content, 
  deliveryDate, 
  recipients, 
  status,
  triggerType,
  id 
}: CapsuleCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'scheduled': return 'bg-warning/20 text-warning border-warning/30';
      case 'delivered': return 'bg-primary/20 text-primary border-primary/30';
      case 'opened': return 'bg-success/20 text-success border-success/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'time': return <Clock className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'connection': return <Users className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isLocked = status === 'scheduled';

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card hover-glow transition-smooth group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isLocked ? 'bg-muted/20' : 'bg-success/20'}`}>
            {isLocked ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Unlock className="w-5 h-5 text-success" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-card-foreground">{title}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              {getTriggerIcon()}
              <span className="capitalize">{triggerType} trigger</span>
            </div>
          </div>
        </div>
        
        <Badge className={`${getStatusColor()}`}>
          {status === 'scheduled' && 'Waiting'}
          {status === 'delivered' && 'Delivered'}
          {status === 'opened' && 'Opened'}
        </Badge>
      </div>

      {/* Content Preview */}
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {isLocked ? '🔒 Content will be revealed when unlocked' : content}
      </p>

      {/* Delivery Info */}
      <div className="bg-muted/10 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {new Date(deliveryDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="flex flex-wrap gap-1 mb-4">
        {recipients.slice(0, 3).map((recipient, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {recipient}
          </Badge>
        ))}
        {recipients.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{recipients.length - 3} more
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" className="hover:bg-primary/20">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {status === 'scheduled' && (
            <Button size="sm" variant="ghost" className="hover:bg-accent/20">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        {status === 'scheduled' && (
          <Button size="sm" variant="ghost" className="hover:bg-destructive/20 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CapsuleCard;