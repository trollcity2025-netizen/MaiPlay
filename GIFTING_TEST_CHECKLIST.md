# Gifting + Boost System Test Checklist

## Database Tests
- [ ] video_gifts table created with correct columns
- [ ] creator_supporter_stats aggregation working
- [ ] video_supporter_stats aggregation working
- [ ] video_boosts duration calculation correct
- [ ] boost_events logging working
- [ ] fraud_events detection triggers
- [ ] RPC function `gift_creator_on_video` executes atomically
- [ ] RPC function `boost_video` executes atomically
- [ ] RPC function `get_video_boost_score` returns correct decay
- [ ] RPC function `get_creator_supporters` returns top 20
- [ ] RPC function `get_video_supporters` returns top 20
- [ ] RLS policies enforce correct access

## Gift System Tests
- [ ] GiftButton opens GiftModal
- [ ] Coin balance verification before gifting
- [ ] Self-gifting prevention
- [ ] Insufficient balance error handling
- [ ] Gift confirmation shows correct message
- [ ] Movie unlock progress updates on gift
- [ ] Supporter leaderboard updates
- [ ] Creator earnings update
- [ ] Coin transaction insertion

## Boost System Tests
- [ ] BoostButton opens BoostModal
- [ ] Boost packages display correct durations
- [ ] Boost applied to video
- [ ] Boost score calculated correctly
- [ ] Boost expires at correct time
- [ ] Boost badge shows accurate time remaining
- [ ] Cannot boost own video (if enforced)

## Edge Cases
- [ ] Multiple rapid gifts handled correctly
- [ ] Concurrent boosts handled correctly
- [ ] Expired boosts don't affect ranking
- [ ] Reported videos cannot be boosted
- [ ] Custom gift amount validation
- [ ] Payment failure handling

## Performance Tests
- [ ] Index usage verified
- [ ] Query performance under load
- [ ] RPC timeout handling
- [ ] Cache invalidation working

## Mobile Tests
- [ ] Gift modal responsive
- [ ] Boost modal responsive
- [ ] Animation performance
- [ ] Touch targets adequate