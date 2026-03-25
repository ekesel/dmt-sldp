"use client";

import React, { useEffect, useState, useRef } from "react";

import { Author } from "../../hooks/useNewsfeedData";

interface StaticPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: Author | null;
  createPost?: (
    title: string,
    content: string,
    category: string,
    imageId: string | null,
  ) => Promise<void>;
  uploadImage?: (
    file: File,
  ) => Promise<{ image_id: string; file_url?: string }>;
}

const StaticPostModal: React.FC<StaticPostModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  createPost,
  uploadImage,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");

  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Reset state
      setTitle("");
      setContent("");
      setCategory("General");
      setSelectedImagePreview(null);
      setSelectedImageFile(null);
      setUploadedImageId(null);
      setIsUploading(false);
      setUploadError(null);
      setIsSubmitting(false);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setUploadError(null);

      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Trigger upload
      if (uploadImage) {
        setIsUploading(true);
        try {
          const res = await uploadImage(file);
          setUploadedImageId(res.image_id);
        } catch (err) {
          console.error("Failed to upload image:", err);
          setUploadError("Failed to upload image. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const removeImage = () => {
    setSelectedImagePreview(null);
    setSelectedImageFile(null);
    setUploadedImageId(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !createPost || isUploading) return;
    setIsSubmitting(true);
    try {
      await createPost(title, content, category, uploadedImageId);
      onClose();
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-125 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="w-8" /> {/* Spacer */}
          <h2 className="text-xl font-bold text-foreground">Create Post</h2>
          <button
            onClick={onClose}
            className="bg-muted p-2 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3">
            {userProfile?.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={userProfile.username}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold border border-border uppercase">
                {userProfile?.username?.charAt(0) ||
                  userProfile?.first_name?.charAt(0) ||
                  "U"}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-foreground font-semibold">
                {userProfile?.first_name || userProfile?.username || "User"}
              </span>
              <div className="bg-muted rounded px-2 py-0.5 mt-0.5 flex items-center gap-1 w-fit">
                <svg
                  className="w-3 h-3 text-muted-foreground"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 012 2v1.5a.5.5 0 00.5.5.5.5 0 00.5-.5V10a5 5 0 00-10 0v.107l-1.668-2.08zM13.828 10.172l-3.656 3.656A2 2 0 0010 16v1a1 1 0 001 1h5.828a2 2 0 001.414-.586l.288-.288A2 2 0 0018 14.718V13a2 2 0 00-2-2h-1a2 2 0 00-1.172.172z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-[11px] font-bold text-muted-foreground">
                  Public
                </span>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <input
              type="text"
              placeholder="Add a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-lg"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Select Category
            </label>
            <div className="flex gap-2">
              {["General", "Tech", "News"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all active:scale-95 ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 bg-transparent border-none outline-none text-xl text-foreground placeholder-muted-foreground resize-none py-2"
            />

            {/* Image Preview */}
            {selectedImagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted group">
                <img
                  src={selectedImagePreview}
                  alt="Preview"
                  className={`w-full h-auto max-h-75 object-contain mx-auto transition-opacity ${isUploading ? "opacity-50" : "opacity-100"}`}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-foreground bg-background/60 px-2 py-1 rounded">
                        Uploading...
                      </span>
                    </div>
                  </div>
                )}
                {!isUploading && (
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-background/60 hover:bg-background/80 text-foreground rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="text-destructive text-xs font-semibold px-2">
                {uploadError}
              </div>
            )}

            {/* Upload Trigger */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
                disabled={isUploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-muted-foreground text-sm font-semibold hover:bg-muted/80 hover:text-foreground transition-all disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Photo
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30">
          <button
            onClick={handlePost}
            disabled={
              isSubmitting || isUploading || !title.trim() || !content.trim()
            }
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Posting..."
              : isUploading
                ? "Uploading Image..."
                : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaticPostModal;
