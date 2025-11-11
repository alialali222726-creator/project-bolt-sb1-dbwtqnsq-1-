import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const horizontalScale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

const isSmallScreen = SCREEN_WIDTH < 375;
const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeScreen = SCREEN_WIDTH >= 414;

const isShortScreen = SCREEN_HEIGHT < 700;
const isTallScreen = SCREEN_HEIGHT >= 900;

const getResponsivePadding = () => {
  if (isSmallScreen) return 12;
  if (isMediumScreen) return 16;
  return 20;
};

const getResponsiveFontSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.9;
  if (isLargeScreen && isTallScreen) return baseSize * 1.05;
  return baseSize;
};

const getHeaderHeight = () => {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  if (isSmallScreen) return 50 + statusBarHeight;
  if (isTallScreen) return 60 + statusBarHeight;
  return 55 + statusBarHeight;
};

const getTabBarHeight = () => {
  if (isSmallScreen) return 60;
  if (isTallScreen) return 72;
  return 68;
};

const getModalMaxHeight = () => {
  if (isShortScreen) return '90%';
  if (isTallScreen) return '80%';
  return '85%';
};

const getCardPadding = () => {
  if (isSmallScreen) return 12;
  if (isLargeScreen) return 20;
  return 16;
};

const getIconSize = (baseSize: number) => {
  if (isSmallScreen) return baseSize * 0.85;
  if (isLargeScreen) return baseSize * 1.1;
  return baseSize;
};

export const responsive = {
  scale: horizontalScale,
  verticalScale,
  moderateScale,
  fontSize: getResponsiveFontSize,
  padding: getResponsivePadding(),
  headerHeight: getHeaderHeight(),
  tabBarHeight: getTabBarHeight(),
  modalMaxHeight: getModalMaxHeight(),
  cardPadding: getCardPadding(),
  iconSize: getIconSize,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  isShortScreen,
  isTallScreen,
};
