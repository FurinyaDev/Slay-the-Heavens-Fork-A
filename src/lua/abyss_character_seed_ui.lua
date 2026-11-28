local RunSeed=require('abyss_run_seed')
local M={}
local maxDigits=19
local invalid='请输入有效的有符号 64 位整数。'

local function visible(control,value)
    if control.visible~=value then control:SetVisible(value)end
end

local function text(control,value)
    if control.text~=value then control.text=value end
end

function M.new(panel,keys)
    local entry,editor=panel:GetChild('seedEntry'),panel:GetChild('seedEditor')
    if not entry or not editor then return nil end
    local entryLabel,value,status=entry:GetChild('label'),editor:GetChild('value'),editor:GetChild('status')
    local seed={open=false,draft=''}

    function seed:paint(enabled)
        visible(entry,enabled)
        local open=enabled and self.open
        visible(editor,open)
        if keys and editor.disableKeyEventPassthrough~=open then editor.disableKeyEventPassthrough=open end
        text(entryLabel,self.value and ('种子  '..self.value) or '随机种子')
    end

    function seed:reset()
        self.value,self.open,self.draft=nil,false,''
        self:paint(false)
    end

    local function draft(valueText)
        seed.draft=valueText
        text(value,valueText=='' and '—' or valueText)
        text(status,'')
        return true
    end

    local function add(digit)
        local count=#seed.draft
        if seed.draft:sub(1,1)=='-' then count=count-1 end
        if count>maxDigits then return false end
        return draft(seed.draft..digit)
    end

    local function flipSign()
        local raw=seed.draft
        return draft(raw:sub(1,1)=='-' and raw:sub(2) or '-'..raw)
    end

    local function erase()
        return draft(seed.draft:sub(1,-2))
    end

    local function close()
        seed.open=false
        seed:paint(true)
        return true
    end

    local function apply()
        local ok,normalized=pcall(RunSeed.normalize,seed.draft)
        if not ok then text(status,invalid);return false end
        seed.value=normalized
        return close()
    end

    function seed:bind(host,clickEvent,bindCommand)
        local selection=host.characterSelection
        local function canEdit()
            return self.open and editor.visible and host.characterOpen and not host.disabled
                and not host.starting and not host.exitOpen and not selection.deckOpen
                and not (host.pageReveal and host.pageReveal:covered())
        end
        local function canOpen()
            return entry.visible and not self.open and selection:canConfirm() and not selection.deckOpen
        end
        bindCommand(entry,'character_seed_open',function()
            self.open=true
            draft(self.value or '')
            self:paint(true)
            return true
        end,canOpen)
        editor:GetChild('blocker'):AddCursorEventListener(clickEvent,function()return true end)
        local function bind(name,action,keyIndex)
            bindCommand(editor:GetChild(name),'character_seed_'..name,action,canEdit)
            local key=keys and keyIndex and keys['KeyboardCraftspersonKey'..keyIndex..'Down']
            if key and editor.AddKeyEventListener then
                editor:AddKeyEventListener(key,function()return canEdit() and action()end)
            end
        end
        for digit=0,9 do
            local label=tostring(digit)
            bind('digit'..label,function()return add(label)end,digit==0 and 10 or digit)
        end
        bind('minus',flipSign,30)
        bind('erase',erase,42)
        bind('apply',apply)
        bind('cancel',close)
        bind('random',function()self.value=nil;return close()end)
    end
    return seed
end
return M
