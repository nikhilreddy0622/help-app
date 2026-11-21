import React from 'react';
import Explore from '@/components/explore/ExploreView';

// Results opened from a category or "See all": outside the tabs, so Back returns where you came from.
export default function Results() {
  return <Explore standalone />;
}
