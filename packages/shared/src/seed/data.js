"use strict";
/**
 * Shared Seed Data for P2P Energy Trading
 * Used by both BPP and CDS services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSeedData = generateSeedData;
// Get tomorrow's date for realistic time windows
function getTomorrowDateStr() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}
/**
 * Generate seed data with proper date-based time windows
 */
function generateSeedData() {
    const dateStr = getTomorrowDateStr();
    return {
        providers: [
            {
                id: 'provider-solar-alpha',
                name: 'Alpha Solar Energy',
                trust_score: 0.85,
                total_orders: 20,
                successful_orders: 17,
            },
            {
                id: 'provider-solar-beta',
                name: 'Beta Green Power',
                trust_score: 0.60,
                total_orders: 5,
                successful_orders: 3,
            },
        ],
        items: [
            {
                id: 'item-solar-001',
                provider_id: 'provider-solar-alpha',
                source_type: 'SOLAR',
                delivery_mode: 'SCHEDULED',
                available_qty: 100,
                meter_id: 'MTR-ALPHA-001',
                production_windows: [
                    { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
                ],
            },
            {
                id: 'item-solar-002',
                provider_id: 'provider-solar-beta',
                source_type: 'SOLAR',
                delivery_mode: 'SCHEDULED',
                available_qty: 150,
                meter_id: 'MTR-BETA-001',
                production_windows: [
                    { startTime: `${dateStr}T06:00:00Z`, endTime: `${dateStr}T20:00:00Z` },
                ],
            },
        ],
        offers: [
            {
                id: 'offer-alpha-morning',
                item_id: 'item-solar-001',
                provider_id: 'provider-solar-alpha',
                price_value: 6.50,
                currency: 'INR',
                max_qty: 50,
                time_window: { startTime: `${dateStr}T10:00:00Z`, endTime: `${dateStr}T14:00:00Z` },
                offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
            },
            {
                id: 'offer-beta-afternoon',
                item_id: 'item-solar-002',
                provider_id: 'provider-solar-beta',
                price_value: 5.25,
                currency: 'INR',
                max_qty: 100,
                time_window: { startTime: `${dateStr}T12:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
                offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
            },
        ],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFrREgsNENBcUVDO0FBbEhELGlEQUFpRDtBQUNqRCxTQUFTLGtCQUFrQjtJQUN6QixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQzVCLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLE9BQU8sUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBcUNEOztHQUVHO0FBQ0gsU0FBZ0IsZ0JBQWdCO0lBQzlCLE1BQU0sT0FBTyxHQUFHLGtCQUFrQixFQUFFLENBQUM7SUFFckMsT0FBTztRQUNMLFNBQVMsRUFBRTtZQUNUO2dCQUNFLEVBQUUsRUFBRSxzQkFBc0I7Z0JBQzFCLElBQUksRUFBRSxvQkFBb0I7Z0JBQzFCLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixZQUFZLEVBQUUsRUFBRTtnQkFDaEIsaUJBQWlCLEVBQUUsRUFBRTthQUN0QjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixZQUFZLEVBQUUsQ0FBQztnQkFDZixpQkFBaUIsRUFBRSxDQUFDO2FBQ3JCO1NBQ0Y7UUFFRCxLQUFLLEVBQUU7WUFDTDtnQkFDRSxFQUFFLEVBQUUsZ0JBQWdCO2dCQUNwQixXQUFXLEVBQUUsc0JBQXNCO2dCQUNuQyxXQUFXLEVBQUUsT0FBTztnQkFDcEIsYUFBYSxFQUFFLFdBQVc7Z0JBQzFCLGFBQWEsRUFBRSxHQUFHO2dCQUNsQixRQUFRLEVBQUUsZUFBZTtnQkFDekIsa0JBQWtCLEVBQUU7b0JBQ2xCLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUU7aUJBQ3ZFO2FBQ0Y7WUFDRDtnQkFDRSxFQUFFLEVBQUUsZ0JBQWdCO2dCQUNwQixXQUFXLEVBQUUscUJBQXFCO2dCQUNsQyxXQUFXLEVBQUUsT0FBTztnQkFDcEIsYUFBYSxFQUFFLFdBQVc7Z0JBQzFCLGFBQWEsRUFBRSxHQUFHO2dCQUNsQixRQUFRLEVBQUUsY0FBYztnQkFDeEIsa0JBQWtCLEVBQUU7b0JBQ2xCLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUU7aUJBQ3ZFO2FBQ0Y7U0FDRjtRQUVELE1BQU0sRUFBRTtZQUNOO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLE9BQU8sRUFBRSxnQkFBZ0I7Z0JBQ3pCLFdBQVcsRUFBRSxzQkFBc0I7Z0JBQ25DLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixRQUFRLEVBQUUsS0FBSztnQkFDZixPQUFPLEVBQUUsRUFBRTtnQkFDWCxXQUFXLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLFlBQVksRUFBRTtnQkFDbkYsZ0JBQWdCLEVBQUUsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUU7YUFDdkU7WUFDRDtnQkFDRSxFQUFFLEVBQUUsc0JBQXNCO2dCQUMxQixPQUFPLEVBQUUsZ0JBQWdCO2dCQUN6QixXQUFXLEVBQUUscUJBQXFCO2dCQUNsQyxXQUFXLEVBQUUsSUFBSTtnQkFDakIsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsT0FBTyxFQUFFLEdBQUc7Z0JBQ1osV0FBVyxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxZQUFZLEVBQUU7Z0JBQ25GLGdCQUFnQixFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFO2FBQ3ZFO1NBQ0Y7S0FDRixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU2hhcmVkIFNlZWQgRGF0YSBmb3IgUDJQIEVuZXJneSBUcmFkaW5nXG4gKiBVc2VkIGJ5IGJvdGggQlBQIGFuZCBDRFMgc2VydmljZXNcbiAqL1xuXG5pbXBvcnQgeyBTb3VyY2VUeXBlLCBEZWxpdmVyeU1vZGUsIE9mZmVyQXR0cmlidXRlcyB9IGZyb20gJy4uL3R5cGVzL2NhdGFsb2cnO1xuaW1wb3J0IHsgVGltZVdpbmRvdyB9IGZyb20gJy4uL3R5cGVzL2JlY2tuJztcblxuLy8gR2V0IHRvbW9ycm93J3MgZGF0ZSBmb3IgcmVhbGlzdGljIHRpbWUgd2luZG93c1xuZnVuY3Rpb24gZ2V0VG9tb3Jyb3dEYXRlU3RyKCk6IHN0cmluZyB7XG4gIGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUoKTtcbiAgdG9tb3Jyb3cuc2V0RGF0ZSh0b21vcnJvdy5nZXREYXRlKCkgKyAxKTtcbiAgcmV0dXJuIHRvbW9ycm93LnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZWVkUHJvdmlkZXIge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHRydXN0X3Njb3JlOiBudW1iZXI7XG4gIHRvdGFsX29yZGVyczogbnVtYmVyO1xuICBzdWNjZXNzZnVsX29yZGVyczogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlZWRJdGVtIHtcbiAgaWQ6IHN0cmluZztcbiAgcHJvdmlkZXJfaWQ6IHN0cmluZztcbiAgc291cmNlX3R5cGU6IFNvdXJjZVR5cGU7XG4gIGRlbGl2ZXJ5X21vZGU6IERlbGl2ZXJ5TW9kZTtcbiAgYXZhaWxhYmxlX3F0eTogbnVtYmVyO1xuICBtZXRlcl9pZDogc3RyaW5nO1xuICBwcm9kdWN0aW9uX3dpbmRvd3M6IFRpbWVXaW5kb3dbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZWVkT2ZmZXIge1xuICBpZDogc3RyaW5nO1xuICBpdGVtX2lkOiBzdHJpbmc7XG4gIHByb3ZpZGVyX2lkOiBzdHJpbmc7XG4gIHByaWNlX3ZhbHVlOiBudW1iZXI7XG4gIGN1cnJlbmN5OiBzdHJpbmc7XG4gIG1heF9xdHk6IG51bWJlcjtcbiAgdGltZV93aW5kb3c6IFRpbWVXaW5kb3c7XG4gIG9mZmVyX2F0dHJpYnV0ZXM6IE9mZmVyQXR0cmlidXRlcztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZWVkRGF0YSB7XG4gIHByb3ZpZGVyczogU2VlZFByb3ZpZGVyW107XG4gIGl0ZW1zOiBTZWVkSXRlbVtdO1xuICBvZmZlcnM6IFNlZWRPZmZlcltdO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIHNlZWQgZGF0YSB3aXRoIHByb3BlciBkYXRlLWJhc2VkIHRpbWUgd2luZG93c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVTZWVkRGF0YSgpOiBTZWVkRGF0YSB7XG4gIGNvbnN0IGRhdGVTdHIgPSBnZXRUb21vcnJvd0RhdGVTdHIoKTtcblxuICByZXR1cm4ge1xuICAgIHByb3ZpZGVyczogW1xuICAgICAge1xuICAgICAgICBpZDogJ3Byb3ZpZGVyLXNvbGFyLWFscGhhJyxcbiAgICAgICAgbmFtZTogJ0FscGhhIFNvbGFyIEVuZXJneScsXG4gICAgICAgIHRydXN0X3Njb3JlOiAwLjg1LFxuICAgICAgICB0b3RhbF9vcmRlcnM6IDIwLFxuICAgICAgICBzdWNjZXNzZnVsX29yZGVyczogMTcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ3Byb3ZpZGVyLXNvbGFyLWJldGEnLFxuICAgICAgICBuYW1lOiAnQmV0YSBHcmVlbiBQb3dlcicsXG4gICAgICAgIHRydXN0X3Njb3JlOiAwLjYwLFxuICAgICAgICB0b3RhbF9vcmRlcnM6IDUsXG4gICAgICAgIHN1Y2Nlc3NmdWxfb3JkZXJzOiAzLFxuICAgICAgfSxcbiAgICBdLFxuXG4gICAgaXRlbXM6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdpdGVtLXNvbGFyLTAwMScsXG4gICAgICAgIHByb3ZpZGVyX2lkOiAncHJvdmlkZXItc29sYXItYWxwaGEnLFxuICAgICAgICBzb3VyY2VfdHlwZTogJ1NPTEFSJyxcbiAgICAgICAgZGVsaXZlcnlfbW9kZTogJ1NDSEVEVUxFRCcsXG4gICAgICAgIGF2YWlsYWJsZV9xdHk6IDEwMCxcbiAgICAgICAgbWV0ZXJfaWQ6ICdNVFItQUxQSEEtMDAxJyxcbiAgICAgICAgcHJvZHVjdGlvbl93aW5kb3dzOiBbXG4gICAgICAgICAgeyBzdGFydFRpbWU6IGAke2RhdGVTdHJ9VDA4OjAwOjAwWmAsIGVuZFRpbWU6IGAke2RhdGVTdHJ9VDE4OjAwOjAwWmAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnaXRlbS1zb2xhci0wMDInLFxuICAgICAgICBwcm92aWRlcl9pZDogJ3Byb3ZpZGVyLXNvbGFyLWJldGEnLFxuICAgICAgICBzb3VyY2VfdHlwZTogJ1NPTEFSJyxcbiAgICAgICAgZGVsaXZlcnlfbW9kZTogJ1NDSEVEVUxFRCcsXG4gICAgICAgIGF2YWlsYWJsZV9xdHk6IDE1MCxcbiAgICAgICAgbWV0ZXJfaWQ6ICdNVFItQkVUQS0wMDEnLFxuICAgICAgICBwcm9kdWN0aW9uX3dpbmRvd3M6IFtcbiAgICAgICAgICB7IHN0YXJ0VGltZTogYCR7ZGF0ZVN0cn1UMDY6MDA6MDBaYCwgZW5kVGltZTogYCR7ZGF0ZVN0cn1UMjA6MDA6MDBaYCB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuXG4gICAgb2ZmZXJzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnb2ZmZXItYWxwaGEtbW9ybmluZycsXG4gICAgICAgIGl0ZW1faWQ6ICdpdGVtLXNvbGFyLTAwMScsXG4gICAgICAgIHByb3ZpZGVyX2lkOiAncHJvdmlkZXItc29sYXItYWxwaGEnLFxuICAgICAgICBwcmljZV92YWx1ZTogNi41MCxcbiAgICAgICAgY3VycmVuY3k6ICdJTlInLFxuICAgICAgICBtYXhfcXR5OiA1MCxcbiAgICAgICAgdGltZV93aW5kb3c6IHsgc3RhcnRUaW1lOiBgJHtkYXRlU3RyfVQxMDowMDowMFpgLCBlbmRUaW1lOiBgJHtkYXRlU3RyfVQxNDowMDowMFpgIH0sXG4gICAgICAgIG9mZmVyX2F0dHJpYnV0ZXM6IHsgcHJpY2luZ01vZGVsOiAnUEVSX0tXSCcsIHNldHRsZW1lbnRUeXBlOiAnREFJTFknIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ29mZmVyLWJldGEtYWZ0ZXJub29uJyxcbiAgICAgICAgaXRlbV9pZDogJ2l0ZW0tc29sYXItMDAyJyxcbiAgICAgICAgcHJvdmlkZXJfaWQ6ICdwcm92aWRlci1zb2xhci1iZXRhJyxcbiAgICAgICAgcHJpY2VfdmFsdWU6IDUuMjUsXG4gICAgICAgIGN1cnJlbmN5OiAnSU5SJyxcbiAgICAgICAgbWF4X3F0eTogMTAwLFxuICAgICAgICB0aW1lX3dpbmRvdzogeyBzdGFydFRpbWU6IGAke2RhdGVTdHJ9VDEyOjAwOjAwWmAsIGVuZFRpbWU6IGAke2RhdGVTdHJ9VDE4OjAwOjAwWmAgfSxcbiAgICAgICAgb2ZmZXJfYXR0cmlidXRlczogeyBwcmljaW5nTW9kZWw6ICdQRVJfS1dIJywgc2V0dGxlbWVudFR5cGU6ICdEQUlMWScgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==