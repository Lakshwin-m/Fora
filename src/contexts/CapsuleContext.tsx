import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Capsule {
  id: string;
  title: string;
  content: string;
  deliveryDate: string;
  recipients: string[];
  status: 'scheduled' | 'delivered' | 'opened';
  triggerType: 'time' | 'event' | 'connection';
  attachments?: string[];
  createdAt: string;
}

interface CapsuleContextType {
  capsules: Capsule[];
  addCapsule: (capsule: Omit<Capsule, 'id' | 'createdAt' | 'status'>) => void;
  updateCapsule: (id: string, updates: Partial<Capsule>) => void;
}

const CapsuleContext = createContext<CapsuleContextType | undefined>(undefined);

export const useCapsules = () => {
  const context = useContext(CapsuleContext);
  if (!context) {
    throw new Error('useCapsules must be used within a CapsuleProvider');
  }
  return context;
};

export const CapsuleProvider = ({ children }: { children: ReactNode }) => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);

  // Load capsules from localStorage on mount
  useEffect(() => {
    const savedCapsules = localStorage.getItem('fora-capsules');
    if (savedCapsules) {
      setCapsules(JSON.parse(savedCapsules));
    } else {
      // Initialize with mock data if no saved capsules
      const mockCapsules: Capsule[] = [
        {
          id: '1',
          title: 'Birthday Wishes for Sarah',
          content: 'Happy 25th birthday! Remember when we said we\'d be different by now? Well, here we are...',
          deliveryDate: '2024-03-15T10:00:00Z',
          recipients: ['Sarah Johnson', 'Mike Chen'],
          status: 'scheduled',
          triggerType: 'time',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          title: 'Graduation Memories',
          content: 'We did it! Here\'s to the future and all the adventures waiting for us.',
          deliveryDate: '2023-12-01T15:30:00Z',
          recipients: ['Alex Rivera', 'Emma Wilson', 'David Kim'],
          status: 'opened',
          triggerType: 'event',
          createdAt: '2023-11-15T10:00:00Z',
        },
        {
          id: '3',
          title: 'Wedding Day Message',
          content: 'To my future self: I hope you still remember how magical this day felt...',
          deliveryDate: '2024-06-20T18:00:00Z',
          recipients: ['Future Me'],
          status: 'delivered',
          triggerType: 'connection',
          createdAt: '2024-01-20T10:00:00Z',
        },
        {
          id: '4',
          title: 'Team Project Victory',
          content: 'We finally shipped our first product! This moment feels surreal after months of hard work.',
          deliveryDate: '2024-01-10T09:00:00Z',
          recipients: ['Team Alpha', 'Jessica Park', 'Ryan O\'Connor'],
          status: 'scheduled',
          triggerType: 'time',
          createdAt: '2023-12-20T10:00:00Z',
        },
      ];
      setCapsules(mockCapsules);
      localStorage.setItem('fora-capsules', JSON.stringify(mockCapsules));
    }
  }, []);

  // Save capsules to localStorage whenever capsules change
  useEffect(() => {
    localStorage.setItem('fora-capsules', JSON.stringify(capsules));
  }, [capsules]);

  const addCapsule = (capsuleData: Omit<Capsule, 'id' | 'createdAt' | 'status'>) => {
    const newCapsule: Capsule = {
      ...capsuleData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'scheduled', // New capsules are always scheduled initially
    };
    setCapsules(prev => [newCapsule, ...prev]);
  };

  const updateCapsule = (id: string, updates: Partial<Capsule>) => {
    setCapsules(prev => 
      prev.map(capsule => 
        capsule.id === id ? { ...capsule, ...updates } : capsule
      )
    );
  };

  return (
    <CapsuleContext.Provider value={{ capsules, addCapsule, updateCapsule }}>
      {children}
    </CapsuleContext.Provider>
  );
};