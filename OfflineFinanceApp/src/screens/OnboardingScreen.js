import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {STORAGE_KEYS} from '../utils/constants';
import {COLORS, FONT_FAMILY} from '../theme/theme';

const {width, height} = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to OJAT',
    description: 'The definitive offline journal for accounting and trading.',
    image: require('../assets/images/primary_logo.png'),
  },
  {
    id: '2',
    title: 'Track Your Finances',
    description: 'Keep a close eye on your expenses, sales, and inventory even when offline.',
    image: require('../assets/images/app_icon.png'),
  },
  {
    id: '3',
    title: 'Ready to Start?',
    description: 'Join us today and take control of your business effortlessly.',
    image: require('../assets/images/full_logo.png'),
  },
];

const OnboardingScreen = ({navigation}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE).then(status => {
        if (status === 'true') {
          navigation.replace('Landing');
        }
      });
    }, [navigation])
  );

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      navigation.replace('Landing');
    } catch (error) {
      console.log('Error saving onboarding state:', error);
    }
  };

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({index: currentIndex + 1});
    } else {
      completeOnboarding();
    }
  };

  const viewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({item}) => {
    return (
      <View style={styles.slide}>
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={completeOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={slidesRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={item => item.id}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={{viewAreaCoveragePercentThreshold: 50}}
      />

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={scrollToNext}>
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
  },
  slide: {
    width,
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginTop: 40,
  },
  textContainer: {
    flex: 0.3,
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  footer: {
    height: 120,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.line,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.primaryForeground,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
  },
});

export default OnboardingScreen;
