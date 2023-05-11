import * as Haptics from "expo-haptics"
import { useCallback, useState } from "react"
import { StyleSheet, View } from "react-native"
import {
  SharedValue,
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { ListItem } from "./ListItem"

export type Item = {
  id: number
  label: string
}

export type DragInfo = {
  id: number
  currentIndex: number
  movedPosition: "up" | "down" | null
}

export type MovedPosition = "up" | "down" | null

export type InsertLineValue = "top" | "bottom" | null

const ItemHeight = 60

export function DraggableList() {
  const items = [
    { id: 1, label: "Item 1" },
    { id: 2, label: "Item 2" },
    { id: 3, label: "Item 3" },
    { id: 4, label: "Item 4" },
    { id: 5, label: "Item 5" },
  ]

  const itemOffsetYs: Record<string, SharedValue<number>> = items.reduce(
    (o, item, index) => ({
      ...o,
      [item.id]: useSharedValue(ItemHeight * index),
    }),
    {},
  )

  const itemCurrentIndexes: Record<string, SharedValue<number>> = items.reduce(
    (o, item, index) => ({
      ...o,
      [item.id]: useSharedValue(index),
    }),
    {},
  )

  const itemMovedPositions: Record<
    string,
    SharedValue<MovedPosition>
  > = items.reduce(
    (o, item) => ({
      ...o,
      [item.id]: useSharedValue(null),
    }),
    {},
  )

  const itemInsertLines: Record<
    string,
    SharedValue<InsertLineValue>
  > = items.reduce(
    (o, item) => ({
      ...o,
      [item.id]: useSharedValue(null),
    }),
    {},
  )

  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  const handleLongPress = useCallback((id: number) => {
    console.log("handleLongPress:", id)
    setActiveItemId(id)
    Haptics.selectionAsync()
  }, [])

  const onDragEnd = (sortedItems: Item[]) => {
    console.log("sortedItems:", sortedItems)
    setActiveItemId(null)
  }

  const panGestures = {
    onUpdate: ({ id, translationY, velocityY }) => {
      "worklet"
      const movingIndex = itemCurrentIndexes[id].value

      const baseOffset = movingIndex * ItemHeight
      itemOffsetYs[id].value = baseOffset + translationY
      const y = ItemHeight * movingIndex + translationY

      const direction = velocityY > 0 ? "down" : velocityY < 0 ? "up" : null

      if (direction === "down") {
        let moveTargetId: number | null = null
        for (const item of items) {
          const targetId = item.id
          if (targetId === id) {
            continue
          }

          const target = {
            offsetY: itemOffsetYs[targetId].value,
            currentIndex: itemCurrentIndexes[targetId].value,
            movedPosition: itemMovedPositions[targetId].value,
          }

          const isOriginallyUpPosition =
            target.currentIndex < movingIndex && target.movedPosition == null
          if (isOriginallyUpPosition) {
            continue
          }

          const wasAlreadyMovedUp = target.movedPosition === "up"
          if (wasAlreadyMovedUp) {
            continue
          }

          const targetY = target.offsetY
          const currentItemBottom = y + ItemHeight
          const insertLineBoundary = targetY + ItemHeight * 0.5
          const replacementBoundary = targetY + ItemHeight * 0.7

          if (currentItemBottom > insertLineBoundary) {
            itemInsertLines[targetId].value = "bottom"
          }

          if (currentItemBottom > replacementBoundary) {
            moveTargetId = targetId
            break
          }
        }

        if (moveTargetId) {
          clearInsertLines()

          const target = {
            offsetY: itemOffsetYs[moveTargetId].value,
            currentIndex: itemCurrentIndexes[moveTargetId].value,
            movedPosition: itemMovedPositions[moveTargetId].value,
          }

          itemMovedPositions[moveTargetId].value =
            target.movedPosition === "down" ? null : "up"

          const nextOffsetY = target.offsetY - ItemHeight
          itemOffsetYs[moveTargetId].value = withTiming(nextOffsetY, {
            duration: 200,
          })
        }
      } else if (direction === "up") {
        let moveTargetId: number | null = null
        for (const item of items) {
          const targetId = item.id
          if (targetId === id) {
            continue
          }
          const target = {
            offsetY: itemOffsetYs[targetId].value,
            currentIndex: itemCurrentIndexes[targetId].value,
            movedPosition: itemMovedPositions[targetId].value,
          }
          const isOriginallyDownPosition =
            target.currentIndex > movingIndex && target.movedPosition == null
          if (isOriginallyDownPosition) {
            continue
          }
          const wasAlreadyMovedDown = target.movedPosition === "down"
          if (wasAlreadyMovedDown) {
            continue
          }

          const targetY = target.offsetY
          const currentItemTop = y
          const replaceBoundary = targetY + ItemHeight * 0.3
          const insertLineBoundary = targetY + ItemHeight * 0.5
          if (currentItemTop < insertLineBoundary) {
            itemInsertLines[targetId].value = "top"
          }

          if (currentItemTop < replaceBoundary) {
            moveTargetId = targetId
            break
          }
        }

        if (moveTargetId) {
          clearInsertLines()

          const target = {
            offsetY: itemOffsetYs[moveTargetId].value,
            currentIndex: itemCurrentIndexes[moveTargetId].value,
            movedPosition: itemMovedPositions[moveTargetId].value,
          }

          itemMovedPositions[moveTargetId].value =
            target.movedPosition === "up" ? null : "down"

          const nextOffsetY = target.offsetY + ItemHeight
          itemOffsetYs[moveTargetId].value = withTiming(nextOffsetY, {
            duration: 200,
          })
        }
      } else {
      }

      function clearInsertLines() {
        for (const item of items) {
          itemInsertLines[item.id].value = null
        }
      }
    },
    onEnd: (id: number) => {
      "worklet"
      const movingIndex = itemCurrentIndexes[id].value

      const idsSorted: number[] = Object.entries(itemCurrentIndexes)
        .sort(([, index1], [, index2]) => index1.value - index2.value)
        .map(([id]) => parseInt(id, 10))

      const sortedData = idsSorted.map((id, index) => ({
        id: id,
        value: itemMovedPositions[id].value,
        index,
      }))

      const destinationIndex = getDestinationIndex(movingIndex, sortedData)

      const offsetShouldBe = destinationIndex * ItemHeight

      itemOffsetYs[id].value = withTiming(offsetShouldBe, { duration: 200 })

      const idsResorted = sortItems(idsSorted, movingIndex, destinationIndex)

      idsResorted.forEach((id, index) => {
        itemCurrentIndexes[id].value = index
        itemMovedPositions[id].value = null
      })

      console.log("items:", items)

      const sortedItems = idsResorted.map(id =>
        items.find(item => item.id === id),
      )

      runOnJS(onDragEnd)(sortedItems)
    },
  }

  return (
    <View style={[styles.list, { height: ItemHeight * items.length }]}>
      {items.map((item, i) => (
        <ListItem
          index={i}
          key={item.id}
          item={item}
          offsetY={itemOffsetYs[item.id]}
          isActive={item.id === activeItemId}
          insertLine={itemInsertLines[item.id]}
          height={ItemHeight}
          panGestures={panGestures}
          onLongPress={handleLongPress}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {},
})

function sortItems<T>(items: T[], fromIndex: number, destinationIndex: number) {
  "worklet"
  const newItems = [...items]
  const [removed] = newItems.splice(fromIndex, 1)
  newItems.splice(destinationIndex, 0, removed)
  return newItems
}

function getDestinationIndex(
  movingIndex: number,
  sortedData: {
    id: number
    value: MovedPosition
    index: number
  }[],
): number {
  "worklet"
  if (sortedData.every(d => d.value === null)) {
    // 1つも入れ替わっていない場合
    return movingIndex
  }
  const moved = sortedData.find(d => d.value !== null)
  const isMovedDown = moved.value === "up"
  if (isMovedDown) {
    // 下に移動 (他アイテムが上に移動)
    if (sortedData[sortedData.length - 1].value === "up") {
      // 一番下まで移動された場合
      return sortedData.length - 1
    }
    const lastMovedIndex = sortedData.reduce(
      (last, d, index) => (d.value === null ? last : index),
      0,
    )
    return lastMovedIndex
  } else {
    // 上に移動 (他アイテムが下に移動)
    if (sortedData[0].value === "down") {
      // 一番上まで移動された場合
      return 0
    }
    const firstMovedIndex = sortedData.findIndex(d => d.value !== null)
    return firstMovedIndex
  }
}
