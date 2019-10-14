import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  Platform,
  ViewPropTypes,
} from 'react-native';

import Line from '../line';
import Label from '../label';
import Affix from '../affix';
import Helper from '../helper';
import Counter from '../counter';

import styles from './styles.js';

function startAnimation(animation, options, callback) {
  Animated
    .timing(animation, options)
    .start(callback);
}

function labelStateFromProps(props, state) {
  let { placeholder, defaultValue } = props;
  let { text, receivedFocus } = state;

  return !!(placeholder || text || (!receivedFocus && defaultValue));
}

function errorStateFromProps(props, state) {
  let { error } = props;

  return !!error;
}

export default class TextField extends PureComponent {
  static defaultProps = {
    underlineColorAndroid: 'transparent',
    disableFullscreenUI: true,
    autoCapitalize: 'sentences',
    editable: true,

    animationDuration: 225,

    fontSize: 16,
    titleFontSize: 12,
    labelFontSize: 12,
    labelHeight: 32,
    labelPadding: 4,
    inputContainerPadding: 8,

    tintColor: 'rgb(0, 145, 234)',
    textColor: 'rgba(0, 0, 0, .87)',
    baseColor: 'rgba(0, 0, 0, .38)',

    errorColor: 'rgb(213, 0, 0)',

    lineWidth: StyleSheet.hairlineWidth,
    activeLineWidth: 2,
    disabledLineWidth: 1,

    lineType: 'solid',
    disabledLineType: 'dotted',

    disabled: false,
  };

  static propTypes = {
    ...TextInput.propTypes,

    animationDuration: PropTypes.number,

    fontSize: PropTypes.number,
    titleFontSize: PropTypes.number,
    labelFontSize: PropTypes.number,
    labelHeight: PropTypes.number,
    labelPadding: PropTypes.number,
    inputContainerPadding: PropTypes.number,

    labelTextStyle: Text.propTypes.style,
    titleTextStyle: Text.propTypes.style,
    affixTextStyle: Text.propTypes.style,

    tintColor: PropTypes.string,
    textColor: PropTypes.string,
    baseColor: PropTypes.string,

    label: PropTypes.string.isRequired,
    title: PropTypes.string,

    characterRestriction: PropTypes.number,

    error: PropTypes.string,
    errorColor: PropTypes.string,

    lineWidth: PropTypes.number,
    activeLineWidth: PropTypes.number,
    disabledLineWidth: PropTypes.number,

    lineType: Line.propTypes.lineType,
    disabledLineType: Line.propTypes.lineType,

    disabled: PropTypes.bool,

    formatText: PropTypes.func,

    renderLeftAccessory: PropTypes.func,
    renderRightAccessory: PropTypes.func,

    prefix: PropTypes.string,
    suffix: PropTypes.string,

    containerStyle: (ViewPropTypes || View.propTypes).style,
    inputContainerStyle: (ViewPropTypes || View.propTypes).style,
  };

  static getDerivedStateFromProps({ error }, state) {
    /* Keep last received error in state */
    if (error && error !== state.error) {
      return { error };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onPress = this.focus.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.onContentSizeChange = this.onContentSizeChange.bind(this);
    this.onFocusAnimationEnd = this.onFocusAnimationEnd.bind(this);

    this.inputRef = React.createRef();
    this.mounted = false;
    this.focused = false;

    let { value: text, error, fontSize } = this.props;

    let labelState = labelStateFromProps(this.props, { text })? 1 : 0;
    let focusState = errorStateFromProps(this.props)? -1 : 0;

    this.state = {
      text,
      error,

      focusAnimation: new Animated.Value(focusState),
      labelAnimation: new Animated.Value(labelState),

      receivedFocus: false,

      height: fontSize * 1.5,
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    let errorState = errorStateFromProps(this.props);
    let prevErrorState = errorStateFromProps(prevProps);

    if (errorState ^ prevErrorState) {
      this.startFocusAnimation();
    }

    let labelState = labelStateFromProps(this.props, this.state);
    let prevLabelState = labelStateFromProps(prevProps, prevState);

    if (labelState ^ prevLabelState) {
      this.startLabelAnimation();
    }
  }

  startFocusAnimation() {
    let { focusAnimation } = this.state;
    let { animationDuration: duration } = this.props;

    let options = {
      toValue: this.focusState(),
      duration,
    };

    startAnimation(focusAnimation, options, this.onFocusAnimationEnd);
  }

  startLabelAnimation() {
    let { labelAnimation } = this.state;
    let { animationDuration: duration } = this.props;

    let options = {
      toValue: this.labelState(),
      duration,
    };

    startAnimation(labelAnimation, options);
  }

  setNativeProps(props) {
    let { current: input } = this.inputRef;

    input.setNativeProps(props);
  }

  focusState() {
    if (errorStateFromProps(this.props)) {
      return -1;
    }

    return this.focused? 1 : 0;
  }

  labelState() {
    if (labelStateFromProps(this.props, this.state)) {
      return 1;
    }

    return this.focused? 1 : 0;
  }

  focus() {
    let { disabled, editable } = this.props;
    let { current: input } = this.inputRef;

    if (!disabled && editable) {
      input.focus();
    }
  }

  blur() {
    let { current: input } = this.inputRef;

    input.blur();
  }

  clear() {
    let { current: input } = this.inputRef;

    input.clear();

    /* onChangeText is not triggered by .clear() */
    this.onChangeText('');
  }

  value() {
    let { text } = this.state;
    let { defaultValue } = this.props;

    let value = this.isDefaultVisible()?
      defaultValue:
      text;

    if (null == value) {
      return '';
    }

    return 'string' === typeof value?
      value:
      String(value);
  }

  setValue(text) {
    this.setState({ text });
  }

  isFocused() {
    let { current: input } = this.inputRef;

    return input.isFocused();
  }

  isRestricted() {
    let { characterRestriction: limit } = this.props;
    let { length: count } = this.value();

    return limit < count;
  }

  isErrored() {
    return errorStateFromProps(this.props);
  }

  isDefaultVisible() {
    let { text, receivedFocus } = this.state;
    let { defaultValue } = this.props;

    return !receivedFocus && null == text && null != defaultValue;
  }

  isPlaceholderVisible() {
    let { placeholder } = this.props;

    return placeholder && !this.focused && !this.value();
  }

  isLabelActive() {
    return 1 === this.labelState();
  }

  onFocus(event) {
    let { onFocus, clearTextOnFocus } = this.props;
    let { receivedFocus } = this.state;

    if ('function' === typeof onFocus) {
      onFocus(event);
    }

    if (clearTextOnFocus) {
      this.clear();
    }

    this.focused = true;

    this.startFocusAnimation();
    this.startLabelAnimation();

    if (!receivedFocus) {
      this.setState({ receivedFocus: true, text: this.value() });
    }
  }

  onBlur(event) {
    let { onBlur } = this.props;

    if ('function' === typeof onBlur) {
      onBlur(event);
    }

    this.focused = false;

    this.startFocusAnimation();
    this.startLabelAnimation();
  }

  onChange(event) {
    let { onChange } = this.props;

    if ('function' === typeof onChange) {
      onChange(event);
    }
  }

  onChangeText(text) {
    let { onChangeText, formatText } = this.props;

    if ('function' === typeof formatText) {
      text = formatText(text);
    }

    this.setState({ text });

    if ('function' === typeof onChangeText) {
      onChangeText(text);
    }
  }

  onContentSizeChange(event) {
    let { onContentSizeChange, fontSize } = this.props;
    let { height } = event.nativeEvent.contentSize;

    if ('function' === typeof onContentSizeChange) {
      onContentSizeChange(event);
    }

    this.setState({
      height: Math.max(
        fontSize * 1.5,
        Math.ceil(height) + Platform.select({ ios: 5, android: 1 })
      ),
    });
  }

  onFocusAnimationEnd() {
    let { error } = this.props;
    let { error: retainedError } = this.state;

    if (this.mounted && !error && retainedError) {
      this.setState({ error: null });
    }
  }

  renderAccessory(prop) {
    let { [prop]: renderAccessory } = this.props;

    if ('function' !== typeof renderAccessory) {
      return null;
    }

    return (
      <View style={styles.accessory}>
        {renderAccessory()}
      </View>
    );
  }

  renderAffix(type) {
    let { labelAnimation } = this.state;
    let {
      [type]: affix,
      fontSize,
      baseColor: color,
      affixTextStyle: style,
    } = this.props;

    if (null == affix) {
      return null;
    }

    let props = {
      type,
      style,
      color,
      fontSize,
      labelAnimation,
    };

    return (
      <Affix {...props}>{affix}</Affix>
    );
  }

  renderHelper() {
    let { focusAnimation, error } = this.state;

    let {
      title,
      baseColor,
      errorColor,
      titleFontSize: fontSize,
      titleTextStyle: style,
      characterRestriction: limit,
    } = this.props;

    let { length: count } = this.value();

    let styleProps = {
      style,
      fontSize,
      baseColor,
      errorColor,
    };

    let counterProps = {
      ...styleProps,
      limit,
      count,
    };

    let helperProps = {
      ...styleProps,
      title,
      error,
      focusAnimation,
    };

    return (
      <View style={styles.helperContainer}>
        <Helper {...helperProps} />
        <Counter {...counterProps} />
      </View>
    );
  }

  render() {
    let { labelAnimation, focusAnimation, height } = this.state;
    let {
      style: inputStyleOverrides,
      label,
      title,
      defaultValue,
      characterRestriction: limit,
      editable,
      disabled,
      lineType,
      disabledLineType,
      lineWidth,
      activeLineWidth,
      disabledLineWidth,
      animationDuration,
      fontSize,
      titleFontSize,
      titleTextStyle,
      labelFontSize,
      labelHeight,
      labelPadding,
      labelTextStyle,
      tintColor,
      baseColor,
      textColor,
      errorColor,
      containerStyle,
      inputContainerPadding,
      inputContainerStyle: inputContainerStyleOverrides,
      clearTextOnFocus,
      ...props
    } = this.props;

    if (props.multiline && props.height) {
      /* Disable autogrow if height is passed as prop */
      height = props.height;
    }

    let restricted = this.isRestricted();
    let defaultVisible = this.isDefaultVisible();

    let value = this.value();

    let inputContainerStyle = {
      paddingBottom: inputContainerPadding,

      ...(props.multiline?
        { height: 'web' === Platform.OS? 'auto' : labelHeight + inputContainerPadding + height }:
        { height: labelHeight + inputContainerPadding + fontSize * 1.5 }),
    };

    let inputStyle = {
      fontSize,

      color: (disabled || defaultVisible)?
        baseColor:
        textColor,

      ...(props.multiline?
        {
          height: fontSize * 1.5 + height,
          transform: [{
            translateY: fontSize * 1.5
              + ('ios' === Platform.OS? -3 : 0),
          }],
        }:
        { height: fontSize * 1.5 }),
    };

    let containerProps = {
      style: containerStyle,
      onStartShouldSetResponder: () => true,
      onResponderRelease: this.onPress,
      pointerEvents: !disabled && editable?
        'auto':
        'none',
    };

    let inputContainerProps = {
      style: [
        styles.inputContainer,
        inputContainerStyle,
        inputContainerStyleOverrides,
      ],
    };

    let styleProps = {
      disabled,
      restricted,
      baseColor,
      tintColor,
      errorColor,

      focusAnimation,
      labelAnimation,
    };

    let lineProps = {
      ...styleProps,

      lineWidth,
      activeLineWidth,
      disabledLineWidth,

      lineType,
      disabledLineType,
    };

    let labelProps = {
      ...styleProps,

      fontSize,
      activeFontSize: labelFontSize,

      baseSize: labelHeight,
      basePadding: labelPadding,

      style: labelTextStyle,
    };

    return (
      <View {...containerProps}>
        <Animated.View {...inputContainerProps}>
          <Line {...lineProps} />

          {this.renderAccessory('renderLeftAccessory')}

          <View style={styles.stack}>
            <Label {...labelProps}>{label}</Label>

            <View style={styles.row}>
              {this.renderAffix('prefix')}

              <TextInput
                style={[styles.input, inputStyle, inputStyleOverrides]}
                selectionColor={tintColor}

                {...props}

                editable={!disabled && editable}
                onChange={this.onChange}
                onChangeText={this.onChangeText}
                onContentSizeChange={this.onContentSizeChange}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                value={value}
                ref={this.inputRef}
              />

              {this.renderAffix('suffix')}
            </View>
          </View>

          {this.renderAccessory('renderRightAccessory')}
        </Animated.View>

        {this.renderHelper()}
      </View>
    );
  }
}
