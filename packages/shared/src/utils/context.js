"use strict";
/**
 * Beckn Context Utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
exports.createCallbackContext = createCallbackContext;
const uuid_1 = require("uuid");
const beckn_1 = require("../types/beckn");
/**
 * Create a new Beckn context
 */
function createContext(options) {
    return {
        domain: beckn_1.BECKN_DOMAIN,
        version: beckn_1.BECKN_VERSION,
        action: options.action,
        timestamp: new Date().toISOString(),
        message_id: options.message_id || (0, uuid_1.v4)(),
        transaction_id: options.transaction_id || (0, uuid_1.v4)(),
        bap_id: options.bap_id,
        bap_uri: options.bap_uri,
        bpp_id: options.bpp_id,
        bpp_uri: options.bpp_uri,
        ttl: options.ttl || 'PT30S',
    };
}
/**
 * Create a callback context from an incoming context
 */
function createCallbackContext(incomingContext, callbackAction) {
    return {
        ...incomingContext,
        action: callbackAction,
        message_id: (0, uuid_1.v4)(),
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQW1CSCxzQ0FjQztBQUtELHNEQVVDO0FBOUNELCtCQUFvQztBQUNwQywwQ0FBd0Y7QUFheEY7O0dBRUc7QUFDSCxTQUFnQixhQUFhLENBQUMsT0FBNkI7SUFDekQsT0FBTztRQUNMLE1BQU0sRUFBRSxvQkFBWTtRQUNwQixPQUFPLEVBQUUscUJBQWE7UUFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtRQUNuQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsSUFBSSxJQUFBLFNBQU0sR0FBRTtRQUMxQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWMsSUFBSSxJQUFBLFNBQU0sR0FBRTtRQUNsRCxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksT0FBTztLQUM1QixDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQ25DLGVBQTZCLEVBQzdCLGNBQTJCO0lBRTNCLE9BQU87UUFDTCxHQUFHLGVBQWU7UUFDbEIsTUFBTSxFQUFFLGNBQWM7UUFDdEIsVUFBVSxFQUFFLElBQUEsU0FBTSxHQUFFO1FBQ3BCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtLQUNwQyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQmVja24gQ29udGV4dCBVdGlsaXRpZXNcbiAqL1xuXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IEJlY2tuQ29udGV4dCwgQmVja25BY3Rpb24sIEJFQ0tOX0RPTUFJTiwgQkVDS05fVkVSU0lPTiB9IGZyb20gJy4uL3R5cGVzL2JlY2tuJztcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVDb250ZXh0T3B0aW9ucyB7XG4gIGFjdGlvbjogQmVja25BY3Rpb247XG4gIHRyYW5zYWN0aW9uX2lkPzogc3RyaW5nO1xuICBtZXNzYWdlX2lkPzogc3RyaW5nO1xuICBiYXBfaWQ6IHN0cmluZztcbiAgYmFwX3VyaTogc3RyaW5nO1xuICBicHBfaWQ/OiBzdHJpbmc7XG4gIGJwcF91cmk/OiBzdHJpbmc7XG4gIHR0bD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgQmVja24gY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGV4dChvcHRpb25zOiBDcmVhdGVDb250ZXh0T3B0aW9ucyk6IEJlY2tuQ29udGV4dCB7XG4gIHJldHVybiB7XG4gICAgZG9tYWluOiBCRUNLTl9ET01BSU4sXG4gICAgdmVyc2lvbjogQkVDS05fVkVSU0lPTixcbiAgICBhY3Rpb246IG9wdGlvbnMuYWN0aW9uLFxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIG1lc3NhZ2VfaWQ6IG9wdGlvbnMubWVzc2FnZV9pZCB8fCB1dWlkdjQoKSxcbiAgICB0cmFuc2FjdGlvbl9pZDogb3B0aW9ucy50cmFuc2FjdGlvbl9pZCB8fCB1dWlkdjQoKSxcbiAgICBiYXBfaWQ6IG9wdGlvbnMuYmFwX2lkLFxuICAgIGJhcF91cmk6IG9wdGlvbnMuYmFwX3VyaSxcbiAgICBicHBfaWQ6IG9wdGlvbnMuYnBwX2lkLFxuICAgIGJwcF91cmk6IG9wdGlvbnMuYnBwX3VyaSxcbiAgICB0dGw6IG9wdGlvbnMudHRsIHx8ICdQVDMwUycsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgY2FsbGJhY2sgY29udGV4dCBmcm9tIGFuIGluY29taW5nIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNhbGxiYWNrQ29udGV4dChcbiAgaW5jb21pbmdDb250ZXh0OiBCZWNrbkNvbnRleHQsXG4gIGNhbGxiYWNrQWN0aW9uOiBCZWNrbkFjdGlvblxuKTogQmVja25Db250ZXh0IHtcbiAgcmV0dXJuIHtcbiAgICAuLi5pbmNvbWluZ0NvbnRleHQsXG4gICAgYWN0aW9uOiBjYWxsYmFja0FjdGlvbixcbiAgICBtZXNzYWdlX2lkOiB1dWlkdjQoKSxcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgfTtcbn1cbiJdfQ==