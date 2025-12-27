import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { MessageCircle, Send, Trash2, Reply, Loader2 } from "lucide-react";
import {
  addComment,
  subscribeToComments,
  deleteComment,
  Comment,
} from "@/services/communityServices";

interface CommentSectionProps {
  capsuleId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ capsuleId }) => {
  const auth = getAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to real-time comment updates
    unsubscribeRef.current = subscribeToComments(capsuleId, (newComments) => {
      console.log("Comments loaded:", newComments);
      setComments(newComments);
      setLoading(false);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [capsuleId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || !auth.currentUser) {
      return;
    }

    setSubmitting(true);
    try {
      await addComment(
        capsuleId,
        auth.currentUser.uid,
        auth.currentUser.displayName || "Anonymous",
        auth.currentUser.photoURL || undefined,
        newComment
      );
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !auth.currentUser) {
      return;
    }

    setSubmittingReply(true);
    try {
      await addComment(
        capsuleId,
        auth.currentUser.uid,
        auth.currentUser.displayName || "Anonymous",
        auth.currentUser.photoURL || undefined,
        replyText,
        parentCommentId
      );
      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding reply:", error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await deleteComment(commentId, capsuleId);
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#FB6376] mb-2" />
        <p className="text-sm text-[#5D2A42]/60">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Header */}
      <div className="flex items-center space-x-2 mb-6">
        <MessageCircle className="w-5 h-5 text-[#5D2A42]" />
        <h3 className="text-lg font-semibold text-[#5D2A42]">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comment Form */}
      {auth.currentUser ? (
        <form onSubmit={handleAddComment} className="space-y-3 mb-8">
          <div className="flex items-start space-x-4">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage
                src={auth.currentUser.photoURL || undefined}
                alt={auth.currentUser.displayName || "Anonymous"}
              />
              <AvatarFallback className="bg-[#FB6376] text-white text-sm">
                {getInitials(auth.currentUser.displayName || "User")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] border-2 border-[#5D2A42]/20 bg-white resize-none focus:border-[#FB6376] focus:ring-2 focus:ring-[#FB6376]/20 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="bg-[#FB6376] hover:bg-[#F04860] text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-[#FFDCCC]/20 border border-[#5D2A42]/20 rounded-lg p-4 text-center text-[#5D2A42]/70">
          Please log in to comment
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-[#5D2A42]/60">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Comment */}
              <div className="flex space-x-4 bg-[#FFF9EC]/50 rounded-lg p-4 border border-[#5D2A42]/10">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={comment.userPhoto} alt={comment.userName} />
                  <AvatarFallback className="bg-[#FB6376] text-white text-sm">
                    {getInitials(comment.userName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-[#5D2A42]">
                      {comment.userName}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#5D2A42]/60">
                        {comment.timestamp
                          ? format(comment.timestamp.toDate(), "MMM dd, yyyy")
                          : "Recently"}
                      </span>
                      {auth.currentUser?.uid === comment.userId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[#5D2A42]/40 hover:text-[#FB6376] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[#5D2A42]/80 text-sm break-words">
                    {comment.content}
                  </p>

                  {/* Reply Button */}
                  <div className="mt-3 flex items-center space-x-3">
                    {auth.currentUser && (
                      <button
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id
                          )
                        }
                        className="flex items-center space-x-1 text-xs text-[#5D2A42]/60 hover:text-[#FB6376] transition-colors"
                      >
                        <Reply className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    )}
                    {comment.replyCount > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center space-x-1 text-xs text-[#5D2A42]/60 hover:text-[#FB6376] transition-colors"
                      >
                        <span>
                          {expandedReplies.has(comment.id) ? "Hide" : "Show"}{" "}
                          {comment.replyCount} repl
                          {comment.replyCount > 1 ? "ies" : "y"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && auth.currentUser && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                      <AvatarImage
                        src={auth.currentUser.photoURL || undefined}
                        alt={auth.currentUser.displayName || "Anonymous"}
                      />
                      <AvatarFallback className="bg-[#FB6376] text-white text-xs">
                        {getInitials(auth.currentUser.displayName || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[60px] text-sm border-2 border-[#5D2A42]/20 bg-white resize-none focus:border-[#FB6376] focus:ring-2 focus:ring-[#FB6376]/20 focus:outline-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="border-[#5D2A42]/20 text-[#5D2A42] text-sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={!replyText.trim() || submittingReply}
                          onClick={() => handleAddReply(comment.id)}
                          className="bg-[#FB6376] hover:bg-[#F04860] text-white text-sm"
                        >
                          {submittingReply ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Reply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {expandedReplies.has(comment.id) &&
                comment.replies.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="flex space-x-3 bg-[#FFF0D4]/50 rounded-lg p-3 border border-[#5D2A42]/10"
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage
                            src={reply.userPhoto}
                            alt={reply.userName}
                          />
                          <AvatarFallback className="bg-[#FB6376] text-white text-xs">
                            {getInitials(reply.userName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-[#5D2A42] text-sm">
                              {reply.userName}
                            </h5>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-[#5D2A42]/60">
                                {reply.timestamp
                                  ? format(reply.timestamp.toDate(), "MMM dd")
                                  : "Recently"}
                              </span>
                              {auth.currentUser?.uid === reply.userId && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-[#5D2A42]/40 hover:text-[#FB6376] transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-[#5D2A42]/80 text-xs break-words">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
