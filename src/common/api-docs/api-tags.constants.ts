// OpenAPI tags, one per resource. Scalar groups the sidebar by tag; a
// transition slice shares its parent resource's tag.
export const API_TAGS = {
  auth: 'Auth',
  health: 'Health',
  me: 'Me',
  roomTypes: 'Room types',
  amenities: 'Amenities',
  bookingRequests: 'Booking requests',
  paymentSessions: 'Payment sessions',
  adminUsers: 'Admin · Users',
  adminBookingRequests: 'Admin · Booking requests',
  adminRoomTypes: 'Admin · Room types',
  adminReviews: 'Admin · Reviews',
  adminStatistics: 'Admin · Statistics',
} as const;

// Scalar's `x-tagGroups` extension: a second sidebar level above the tags.
// A tag left out of every group disappears from the sidebar.
export const API_TAG_GROUPS = [
  { name: 'Public', tags: [API_TAGS.auth, API_TAGS.health] },
  {
    name: 'User',
    tags: [
      API_TAGS.me,
      API_TAGS.roomTypes,
      API_TAGS.amenities,
      API_TAGS.bookingRequests,
      API_TAGS.paymentSessions,
    ],
  },
  {
    name: 'Admin',
    tags: [
      API_TAGS.adminUsers,
      API_TAGS.adminBookingRequests,
      API_TAGS.adminRoomTypes,
      API_TAGS.adminReviews,
      API_TAGS.adminStatistics,
    ],
  },
];
