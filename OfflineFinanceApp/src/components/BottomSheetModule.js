import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {Portal, Text} from 'react-native-paper';
import {X} from 'lucide-react-native';
import {COLORS, FONT_FAMILY, cardShadow} from '../theme/theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export const BottomSheetModule = ({
  isOpen,
  onClose,
  title,
  children,
  containerStyle,
  scrollable = true,
}) => {
  const [visible, setVisible] = useState(isOpen);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.root} pointerEvents="box-none">
        {/* Backdrop - captures touches to close */}
        <Animated.View 
          style={[styles.backdrop, {opacity: fadeAnim}]}
        >
          <Pressable style={styles.flex1} onPress={onClose} />
        </Animated.View>

        {/* Floating Sheet Container - blocks background clicks */}
        <Animated.View 
          style={[
            styles.sheetContainer, 
            {transform: [{translateY: slideAnim}]}
          ]}
          pointerEvents="auto"
        >
          <View style={[styles.sheetCard, cardShadow]}>
            {/* Visual Handle Indicator */}
            <View style={styles.handleWrapper}>
              <View style={styles.handleIndicator} />
            </View>
            
            {/* Standardized Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
                <X color={COLORS.muted} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetDivider} />
            
            {scrollable ? (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[styles.contentContainer, containerStyle]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.contentContainer, containerStyle, { flexShrink: 1 }]}>
                {children}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 72, // Stop exactly above the tab bar
    zIndex: 9999,
  },
  flex1: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // Now 0 relative to root.bottom: 72
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1,
    borderColor: COLORS.line, // Match tab bar border
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8, // Reduced since handle adds padding
    paddingBottom: 16,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
  },
  handleIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.muted, // Darker for better visibility
    opacity: 0.4, // Lower opacity for a subtle look
  },
  closeCircle: {
    backgroundColor: COLORS.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    opacity: 0.5,
    marginHorizontal: 24,
  },
  scrollView: {
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
