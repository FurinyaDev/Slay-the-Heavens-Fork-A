local rootA, rootB, mode, count = arg[1], arg[2], arg[3], tonumber(arg[4]) or 51
local names = { 'abyss_data', 'abyss_theme', 'abyss_original_v4_data', 'abyss_narrative', 'abyss_presentation', 'abyss_traveler_portrait_assets' }
local function read(path)
  local file = assert(io.open(path, 'rb'))
  local bytes = assert(file:read('*a'))
  assert(file:close())
  return bytes
end
local function same(a, b)
  local left, right, n = {}, {}, {tables=0, numbers=0, integers=0, floats=0, strings=0, booleans=0}
  local function compare(x, y, path)
    local tx, ty = type(x), type(y)
    assert(tx == ty, path .. ' type ' .. tx .. ' <> ' .. ty)
    if tx == 'table' then
      if left[x] or right[y] then
        assert(left[x] == y and right[y] == x, path .. ' table ownership')
        return
      end
      left[x], right[y] = y, x
      n.tables = n.tables + 1
      assert(getmetatable(x) == nil and getmetatable(y) == nil, path .. ' metatable')
      assert(rawlen(x) == rawlen(y), path .. ' rawlen')
      for k, value in pairs(x) do
        compare(value, rawget(y,k), path .. '/' .. tostring(k))
      end
      for k in pairs(y) do
        assert(rawget(x,k) ~= nil, path .. '/' .. tostring(k) .. ' unexpected key')
      end
    elseif tx == 'number' then
      assert(math.type(x) == math.type(y), path .. ' number subtype')
      n.numbers = n.numbers + 1
      if math.type(x) == 'integer' then
        assert(x == y, path .. ' integer')
        n.integers = n.integers + 1
      else
        assert(string.pack('d', x) == string.pack('d', y), path .. ' float bits')
        n.floats = n.floats + 1
      end
    else
      assert(x == y, path .. ' value ' .. tostring(x) .. ' <> ' .. tostring(y))
      local counter = tx == 'boolean' and 'booleans' or tx .. 's'
      n[counter] = n[counter] + 1
    end
  end
  compare(a, b, '')
  return n
end
local function stats(n)
  return string.format('tables=%d numbers=%d integers=%d floats=%d strings=%d booleans=%d', n.tables, n.numbers, n.integers, n.floats, n.strings, n.booleans)
end
if mode == 'equivalence' then
  for _, name in ipairs(names) do
    local pathA, pathB = rootA .. '/' .. name .. '.lua', rootB .. '/' .. name .. '.lua'
    local first, second = assert(loadfile(pathA)), assert(loadfile(pathB))
    local a, b = first(), second()
    local generatedA, generatedB = pathA:gsub('/payload/', '/generated/'), pathB:gsub('/payload/', '/generated/')
    print('RAW_A', name, stats(same(assert(loadfile(generatedA))(), a)))
    print('RAW_B', name, stats(same(assert(loadfile(generatedB))(), b)))
    if name == 'abyss_theme' then
      assert(a.officialAssets.mapReturnPalette == nil and type(b.officialAssets.mapReturnPalette) == 'table')
      local c = b.officialAssets.mapReturnPalette
      for _, state in ipairs { 'normal','hover','pressed','disabled' } do
        assert(#c[state] == 2)
        for _, colour in ipairs(c[state]) do
          for _, component in pairs(colour) do assert(math.type(component) == 'integer' and component >= 0 and component <= 255) end
        end
      end
      b.officialAssets.mapReturnPalette = nil
    elseif name == 'abyss_traveler_portrait_assets' then
      assert(a.selection133.count == 1940 and #a.selection133.rows == 1940 and b.selection133 == nil)
      a.selection133 = nil
    elseif name == 'abyss_narrative' then
      if a.releaseNotes and b.releaseNotes and a.releaseNotes.build and b.releaseNotes.build then
        assert(a.releaseNotes.build.sourceCommit == os.getenv('REVIEW_SHA_A'))
        assert(b.releaseNotes.build.sourceCommit == os.getenv('REVIEW_SHA_B'))
        a.releaseNotes.build.sourceCommit, b.releaseNotes.build.sourceCommit = nil, nil
      end
    end
    print('SAME_DATA', name, stats(same(a, b)))
    local sample = assert(loadfile(pathB))()
    assert(sample ~= b)
    local private = {}
    local function seen(t)
      if type(t) ~= 'table' or private[t] then return end
      private[t] = true
      for _, child in pairs(t) do seen(child) end
    end
    local visited = {}
    local function fresh(t)
      if type(t) ~= 'table' or visited[t] then return end
      assert(not private[t], name .. ' table reused across module evaluations')
      visited[t] = true
      for _, child in pairs(t) do fresh(child) end
    end
    seen(b)
    fresh(sample)
  end
elseif mode == 'benchmark' then
  local batches = { {}, {} }
  for variant, root in ipairs { rootA, rootB } do
    for _, name in ipairs(names) do
      batches[variant][name] = read(root .. '/' .. name .. '.lua')
    end
  end
  local function one(variant, record)
    local total = { cpu=0, compile=0, exec=0, interim=0, retained=0 }
    for _, name in ipairs(names) do
      local source = batches[variant][name]
      collectgarbage('restart')
      collectgarbage('collect')
      collectgarbage('stop')
      local startMemory = collectgarbage('count')
      local start = os.clock()
      local chunk = assert(load(source, name, 't'))
      local compiled = os.clock()
      local data = chunk()
      local done = os.clock()
      local interimMemory = collectgarbage('count')
      chunk = nil
      collectgarbage('collect')
      local retainedMemory = collectgarbage('count')
      assert(type(data) == 'table')
      total.compile = total.compile + compiled - start
      total.exec = total.exec + done - compiled
      total.interim = total.interim + interimMemory - startMemory
      total.retained = total.retained + retainedMemory - startMemory
      if record then
        print(variant, name, string.format('%.9f %.9f %.6f %.6f', compiled - start, done - compiled, interimMemory - startMemory, retainedMemory - startMemory))
      end
    end
    if record then
      print(variant, 'sum', string.format('%.9f %.9f %.6f %.6f', total.compile, total.exec, total.interim, total.retained))
    end
  end
  for i = 1, 4 do one(1,false); one(2,false) end
  for i = 1, count do
    if i % 2 == 1 then one(1,true); one(2,true) else one(2,true); one(1,true) end
  end
end
