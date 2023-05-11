import { useCallback } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated"
import { InsertLineValue, Item } from "."

type OnUpdateArgs = {
  id: number
  translationY: number
  velocityY: number
}

type Props = {
  index: number
  item: Item
  offsetY: SharedValue<number>
  isActive?: boolean
  insertLine: SharedValue<InsertLineValue>
  height: number
  onLongPress: (id: number) => void
  panGestures: {
    onUpdate: (args: OnUpdateArgs) => void
    onEnd: (id: number) => void
  }
}

export function ListItem(props: Props) {
  const { onLongPress } = props

  const gesture = Gesture.Pan()
    .onUpdate(event => {
      props.panGestures.onUpdate({
        id: props.item.id,
        translationY: event.translationY,
        velocityY: event.velocityY,
      })
    })
    .onEnd(() => {
      props.panGestures.onEnd(props.item.id)
    })

  const itemPositionStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: props.offsetY.value }],
    }
  }, [])

  const insertLineTopStyle = useAnimatedStyle(() => {
    return {
      opacity: props.insertLine.value === "top" ? 1 : 0,
    }
  })

  const insertLineBottomStyle = useAnimatedStyle(() => {
    return {
      opacity: props.insertLine.value === "bottom" ? 1 : 0,
    }
  })

  return (
    <Pressable
      delayLongPress={200}
      onLongPress={useCallback(() => onLongPress(props.item.id), [])}
      style={[styles.pressable, props.isActive && styles.pressableActive]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.item,
            { height: props.height - 12 },
            props.isActive && styles.itemActive,
            itemPositionStyle,
          ]}
        >
          <Text style={styles.text}>{props.item.label}</Text>
          <Animated.View
            style={[
              styles.insertLine,
              styles.insertLineTop,
              insertLineTopStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.insertLine,
              styles.insertLineBottom,
              insertLineBottomStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: {},
  pressableActive: { zIndex: 10 },
  item: {
    position: "absolute",
    width: "100%",
    marginBottom: 8,
    backgroundColor: "lightblue",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  itemActive: { zIndex: 100, backgroundColor: "rgb(150, 150, 250)" },
  text: { fontSize: 16 },
  insertLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "rgb(150, 150, 250)",
  },
  insertLineTop: {
    top: -7,
  },
  insertLineBottom: {
    bottom: -7,
  },
})
