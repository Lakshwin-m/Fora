# Community Capsules Feature - Implementation Guide

## Overview

The **Forá Community Capsules** feature enables users to:

- **Create public capsules** that are shared with the entire community
- **Browse and explore** public capsules from other users
- **Reshare** meaningful memories from the community

The feature maintains a calm, archive-like aesthetic with no engagement pressure.

---

## Pages Created

### 1. **ExploreCapsulesPage** (`/community`)

Browse and filter public capsules from the entire community.

**Features:**

- Grid layout displaying public capsules as cards
- Filters:
  - Category dropdown
  - Sort options: Newest / Most Reshared
- Pagination with "Load More" button
- Creator information on each card
- Category badges and reshare count

**Route:** `GET /community`

**Key Components:**

- Navigation header with filters
- Responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- Empty state when no capsules exist

---

### 2. **CapsuleDetailPage** (`/community/capsule/:id`)

View a single capsule with full content and metadata.

**Features:**

- Full capsule content display
- Creator profile information
- Reshare indicator (if applicable)
- Original capsule lineage display
- "Reshare as Capsule" button
- Like and comment placeholders
- Archive-like presentation

**Route:** `GET /community/capsule/:id`

**Key UI Elements:**

- Back button to archive
- Creator avatar and metadata
- Reshare badge with original creator info
- Original capsule preview section

---

### 3. **Create Public Capsules** (Updated CreateCapsule)

Users can now create public capsules directly from the Create Capsule page.

**New Features:**

- **Three recipient options:**
  - Send to Myself (private, time-locked)
  - Send to Friends (private)
  - **Public (new!)** - Share with entire community
- **Public Capsule Options:**
  - Category selection (Memories, Reflections, Moments, Stories, Milestones, Wisdom, Other)
  - Visibility setting (automatically public)
  - Benefits highlighted in UI
- **Metadata Added:**
  - `visibility: "public" | "private"`
  - `category: string`
  - `createdBy: string` (user ID)
  - `reshareCount: number`
  - `isReshare: boolean`

**Updated Route:** `POST /create` (existing route, enhanced)

**Validation:**

- Public capsules require a category
- Private capsules (self/friends) require delivery date/time
- All capsules require title and content

---

### 4. **UserCapsulesPage** (`/community/user/:userId`)

View all public capsules from a specific user.

**Features:**

- User profile header (avatar, name, bio, capsule count)
- Separate sections for:
  - Original Capsules
  - Reshared Capsules
- Pagination with "Load More" button
- Clear visual separation between sections
- Consistent card design with archive styling

**Route:** `GET /community/user/:userId`

**Key UI Elements:**

- User profile card
- Reshare indicator on each card
- Categorized sections with headers

---

## API Services (`communityServices.ts`)

### Functions

#### 1. `getPublicCapsules(category?, sortBy, lastCapsule?)`

Fetch public capsules with filtering and pagination.

```typescript
const capsules = await getPublicCapsules(
  "memories", // category (optional)
  "newest", // sortBy: "newest" | "mostReshared"
  lastCapsuleDoc // lastCapsule for pagination (optional)
);
```

**Returns:** `Promise<PublicCapsule[]>`

**Parameters:**

- `category?: string` - Filter by category (undefined = all)
- `sortBy?: "newest" | "mostReshared"` - Sort order
- `lastCapsule?: any` - Last document for pagination

**Firestore Query:**

- Filters: `visibility === "public"`
- Orders by: `createdAt` (newest) or `reshareCount` (popular)
- Pagination: 12 items per page

---

#### 2. `getCapsuleDetail(capsuleId)`

Fetch a single capsule with its lineage.

```typescript
const capsule = await getCapsuleDetail("capsule-id-123");
```

**Returns:** `Promise<CapsuleWithLineage | null>`

**Includes:**

- Full capsule data
- Creator information
- Original capsule data (if reshare)

---

#### 3. `getUserPublicCapsules(userId, lastCapsule?)`

Fetch all public capsules by a specific user.

```typescript
const userCapsules = await getUserPublicCapsules("user-id-456");
```

**Returns:** `Promise<PublicCapsule[]>`

**Parameters:**

- `userId: string` - The user ID
- `lastCapsule?: any` - For pagination

---

#### 4. `getCapsuleCategories()`

Fetch all available categories.

```typescript
const categories = await getCapsuleCategories();
// Returns: ["memories", "moments", "reflections", ...]
```

**Returns:** `Promise<string[]>`

---

## Data Types

### PublicCapsule

```typescript
interface PublicCapsule {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  creatorName: string;
  creatorPhoto?: string;
  createdAt: Timestamp;
  category?: string;
  reshareCount: number;
  isReshare: boolean;
  originalCapsuleId?: string;
  visibility: "public" | "private";
}
```

### CapsuleWithLineage

Extends `PublicCapsule` with:

```typescript
{
  originalCapsule?: PublicCapsule;
  resharedFrom?: PublicCapsule;
}
```

---

## Routing Setup

Added to `App.tsx`:

```typescript
{/* Community Routes */}
<Route
  path="/community"
  element={
    <ProtectedRoute>
      <ExploreCapsulesPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/community/capsule/:id"
  element={
    <ProtectedRoute>
      <CapsuleDetailPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/community/user/:userId"
  element={
    <ProtectedRoute>
      <UserCapsulesPage />
    </ProtectedRoute>
  }
/>
```

---

## Navigation Integration

Updated `Navigation.tsx` to include Archive link:

```typescript
const navItems = [
  { path: "/dashboard", label: "My Capsules", icon: Clock },
  { path: "/community", label: "Archive", icon: Archive },
  { path: "/connections", label: "Connections", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: Settings },
];
```

---

## UX Principles Applied

1. **Calm Archive Feel**

   - Muted color palette (#5D2A42, #FB6376)
   - Minimal interactions
   - Clean, spacious layouts

2. **No Engagement Pressure**

   - Like/comment features are subtle
   - No gamification elements
   - Focus on content, not metrics

3. **Clear Visual Hierarchy**

   - Creator info prominently displayed
   - Reshare relationships clearly shown
   - Separate sections for original vs. reshared

4. **Accessibility**
   - All routes protected (ProtectedRoute)
   - Clear back navigation
   - Empty states with helpful guidance

---

## Implementation Checklist

- [x] ExploreCapsulesPage component
- [x] CapsuleDetailPage component
- [x] UserCapsulesPage component
- [x] Community API services
- [x] Routing setup in App.tsx
- [x] Navigation menu integration
- [x] Firestore queries for public capsules
- [ ] Like/comment functionality (backend)
- [ ] Reshare as capsule functionality (backend)
- [ ] Category management (admin)

---

## Future Enhancements

1. **Search Functionality**

   - Full-text search across capsules
   - Search by creator name

2. **Advanced Filtering**

   - Date range filters
   - Creator filters
   - Trending capsules

3. **Social Features**

   - Comments system
   - Likes/reactions
   - Follow creators

4. **Recommendations**

   - "Similar capsules" section
   - Personalized suggestions
   - Trending on archive

5. **Archive Management**
   - Curated collections
   - Featured capsules
   - Editorial picks
