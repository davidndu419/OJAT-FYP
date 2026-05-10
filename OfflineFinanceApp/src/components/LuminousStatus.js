import React, {useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  Dimensions,
  Easing,
} from 'react-native';
import {Portal, Text} from 'react-native-paper';
import {X, CheckCircle2, Info, AlertCircle} from 'lucide-react-native';
import {COLORS, FONT_FAMILY, glowShadow} from '../theme/theme';
import {IconBubble} from './KoboUI';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export const LuminousStatus = ({
  message,
  type = 'info',
  visible,
  onDismiss,
}) => {
  const [isShowing, setIsShowing] = useState(visible);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsShowing(true);
      progressAnim.setValue(0);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 5000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsShowing(false);
      if (onDismiss) onDismiss();
    });
  };

  if (!isShowing) return null;

  const tone = type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary';
  const color = tone === 'success' ? COLORS.success : tone === 'danger' ? COLORS.danger : COLORS.primary;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Portal>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View 
          style={[
            styles.container, 
            glowShadow,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
              borderColor: color + '40',
            }
          ]}
        >
          <View style={styles.content}>
            <IconBubble tone={tone} size={48}>
              {type === 'success' && <CheckCircle2 color={color} size={22} />}
              {type === 'error' && <AlertCircle color={color} size={22} />}
              {type === 'info' && <Info color={color} size={22} />}
            </IconBubble>
            
            <View style={styles.textContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>

            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
              <View style={styles.closeCircle}>
                <X color={COLORS.muted} size={16} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { width: progressWidth, backgroundColor: color }
              ]} 
            />
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 340,
    borderRadius: 30,
    padding: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
