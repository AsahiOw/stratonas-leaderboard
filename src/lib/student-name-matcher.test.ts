import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStudentLookupFromRecords, resolveStudentFromLookup, type StudentRecord } from './student-name-matcher'

const students: StudentRecord[] = [
  { id: 1, name: 'Hoshino' },
  { id: 2, name: 'Hoshino (Swimsuit)' },
  { id: 3, name: 'Hoshino (Armed)' },
  { id: 4, name: 'Aris' },
  { id: 5, name: 'Aris (Maid)' },
  { id: 6, name: 'Shiroko' },
  { id: 7, name: 'Shiroko*Terror' },
  { id: 8, name: 'Rio' },
  { id: 9, name: 'Mari' },
  { id: 10, name: 'Marina' },
  { id: 11, name: 'Nagisa (Swimsuit)' },
  { id: 12, name: 'Shigure (Hot Spring)' },
  { id: 13, name: 'Yuuka (Pajamas)' },
  { id: 14, name: 'Serika (New Year)' },
  { id: 15, name: 'Sakurako (Pop Idol)' },
  { id: 16, name: 'Rio (Armed)' },
  { id: 17, name: 'Hanako' },
  { id: 18, name: 'Hanako (Swimsuit)' },
  { id: 19, name: 'Hibiki (Cheer Squad)' },
  { id: 20, name: 'Yuuka (Pajamas)' },
  { id: 21, name: 'Seia (Swimsuit)' },
  { id: 22, name: 'Kikyou' },
  { id: 23, name: 'Mika' },
  { id: 24, name: 'Hina' },
  { id: 25, name: 'Kokona' },
  { id: 26, name: 'Kanna' },
  { id: 27, name: 'Aru' },
  { id: 28, name: 'Haruka' },
]

const lookup = buildStudentLookupFromRecords(students)

function resolveName(raw: string) {
  return resolveStudentFromLookup(raw, lookup)?.name || null
}

test('resolves manual and variant aliases', () => {
  assert.equal(resolveName('B Hoshi'), 'Hoshino (Armed)')
  assert.equal(resolveName('Hoshino Battle'), 'Hoshino (Armed)')
  assert.equal(resolveName('T Shiroko'), 'Shiroko*Terror')
  assert.equal(resolveName('Kuroko'), 'Shiroko*Terror')
  assert.equal(resolveName('Hibiki Chear'), 'Hibiki (Cheer Squad)')
  assert.equal(resolveName('Swimsuit Seia'), 'Seia (Swimsuit)')
})

test('resolves base-name aliases and romanization variants', () => {
  assert.equal(resolveName('Aris'), 'Aris')
  assert.equal(resolveName('Alice'), 'Aris')
  assert.equal(resolveName('Arisu'), 'Aris')
})

test('resolves meme and emoji-style labels only when unambiguous', () => {
  assert.equal(resolveName('MOMMY rio'), 'Rio')
  assert.equal(resolveName(':marismirk:'), 'Mari')
  assert.equal(resolveName(':hanakoLick:'), 'Hanako')
  assert.equal(resolveName('mari marina fan'), null)
  assert.equal(resolveName(':pyuukasmurk:'), 'Yuuka (Pajamas)')
  assert.equal(resolveName(':hibikicfflove:'), 'Hibiki (Cheer Squad)')
  assert.equal(resolveName('KikyouAtsugrin'), "Kikyou")
  assert.equal(resolveName(':mikastare:'), "Mika")
  assert.equal(resolveName(':trash_hina:'), "Hina")
  assert.equal(resolveName(':Baldshino:'), "Hoshino")
  assert.equal(resolveName(':Kokonut:'), "Kokona")
  assert.equal(resolveName(':hoshinouhee:'), "Hoshino")
  assert.equal(resolveName('Nice to use Kanna for once, so Swimsuit Kanna is my pick for Binah :botatee:'), "Kanna")
  assert.equal(resolveName('Ah Ru'), "Aru")
  assert.equal(resolveName('Kuudere Haruka :harukatired:'), "Haruka")
})

test('resolves existing prefix formats', () => {
  assert.equal(resolveName('S.Nagisa'), 'Nagisa (Swimsuit)')
  assert.equal(resolveName('HS Shigure'), 'Shigure (Hot Spring)')
  assert.equal(resolveName('P Yuuka'), 'Yuuka (Pajamas)')
  assert.equal(resolveName('NY Serika'), 'Serika (New Year)')
  assert.equal(resolveName('I Sakurako'), 'Sakurako (Pop Idol)')
})

test('leaves unknown values unmatched', () => {
  assert.equal(resolveName('not a real student'), null)
})
