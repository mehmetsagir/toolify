#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>

CGEventRef eventTapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    if (type == kCGEventFlagsChanged) {
        CGEventFlags flags = CGEventGetFlags(event);
        
        // Check for left Command key (mask 0x1008 = kCGEventFlagMaskCommand + left side)
        // Left Command: 0x1008, Right Command: 0x1010
        if (flags & kCGEventFlagMaskCommand) {
            // Check if it's left Command (not right)
            // We can't directly distinguish, but we can check if ONLY command is pressed
            if ((flags & kCGEventFlagMaskCommand) && 
                !(flags & kCGEventFlagMaskShift) && 
                !(flags & kCGEventFlagMaskAlternate) && 
                !(flags & kCGEventFlagMaskControl)) {
                // Send notification
                [[NSDistributedNotificationCenter defaultCenter] 
                    postNotificationName:@"com.toolify.leftCommandPressed" 
                    object:nil 
                    userInfo:nil 
                    deliverImmediately:YES];
            }
        }
    }
    
    return event;
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // Request accessibility permission
        NSDictionary *options = @{(__bridge id)kAXTrustedCheckOptionPrompt: @YES};
        Boolean accessEnabled = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
        
        if (!accessEnabled) {
            fprintf(stderr, "Accessibility permission required\n");
            return 1;
        }
        
        // Create event tap
        CGEventMask eventMask = CGEventMaskBit(kCGEventFlagsChanged);
        CFMachPortRef eventTap = CGEventTapCreate(
            kCGSessionEventTap,
            kCGHeadInsertEventTap,
            kCGEventTapOptionDefault,
            eventMask,
            eventTapCallback,
            NULL
        );
        
        if (!eventTap) {
            fprintf(stderr, "Failed to create event tap\n");
            return 1;
        }
        
        CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(
            kCFAllocatorDefault,
            eventTap,
            0
        );
        
        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
        CGEventTapEnable(eventTap, true);
        
        // Keep running
        CFRunLoopRun();
        
        return 0;
    }
}

