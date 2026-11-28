-- Read-only progression display and the current selection request.
local M={}
local rule={
    [0]='普通难度。',
    '更多精英房间。','普通敌人的攻击增强。','精英敌人的攻击增强。','首领的攻击增强。',
    '换幕时回复 75% 的已损失生命。','初始生命为上限的 90%。',
    '普通敌人的生命等属性增强。','精英敌人的生命等属性增强。','首领的生命等属性增强。',
    '初始牌组加入进阶之灾。','药水槽减少 1 格。','升级卡牌奖励更少见。','首领金币奖励减少 25%。',
    '角色的初始生命上限降低。',
}

local function setVisible(control,value)
    if control.visible~=value then control:SetVisible(value)end
end

local function setText(control,value)
    if control.text~=value then control.text=value end
end

local function setArrow(button,enabled)
    setVisible(button:GetChild('normal'),enabled)
    setVisible(button:GetChild('disabled'),not enabled)
    setVisible(button:GetChild('selected'),false)
    local hit=button:GetChild('hit')
    if hit.raycastTarget~=enabled then hit.raycastTarget=enabled end
end

local function unlocked(read,characterId)
    local level=read and read(characterId)
    if type(level)=='number' and level%1==0 and level>=0 and level<#rule+1 then return level end
    return 0
end

function M.new(characterPanel,platform)
    local panel=characterPanel:GetChild('ascensionPicker')
    if not panel then return nil end
    local read=platform.getHighestUnlocked
    local seed=require('abyss_character_seed_ui').new(characterPanel,platform.keyEvents)
    local settings={level=0}
    local previous,nextButton=panel:GetChild('previous'),panel:GetChild('next')
    local rank,detail,unlock=panel:GetChild('rank'),panel:GetChild('rule'),panel:GetChild('unlock')

    local function sync(characterId)
        if settings.characterId~=characterId then settings.characterId=characterId;settings.level=0 end
        settings.maximum=characterId and unlocked(read,characterId) or 0
        settings.level=math.min(settings.level,settings.maximum)
    end

    function settings:paint(characterId)
        sync(characterId)
        setVisible(panel,characterId~=nil)
        if seed then seed:paint(characterId~=nil)end
        if not characterId then return end
        setText(rank,'A'..self.level)
        setText(detail,rule[self.level])
        setText(unlock,'已解锁至 A'..self.maximum)
        setArrow(previous,self.level>0)
        setArrow(nextButton,self.level<self.maximum)
    end

    function settings:request(characterId)
        sync(characterId)
        return {ascension=self.level,seed=seed and seed.value}
    end

    function settings:reset()
        if seed then seed:reset()end
        self:paint(nil)
    end

    function settings.editingSeed()
        return seed and seed.open==true
    end

    function settings:bind(host,clickEvent,bindCommand)
        local selection=host.characterSelection
        if seed then seed:bind(host,clickEvent,bindCommand)end
        local function bindArrow(button,kind,step)
            local function available()
                return panel.visible and selection.info~=nil and self.characterId==selection.info.id
                    and not selection.deckOpen and not self.editingSeed() and button:GetChild('hit').raycastTarget==true
            end
            bindCommand(button,kind,function()
                local candidate=self.level+step
                local characterId=selection.info.id
                sync(characterId)
                if candidate<0 or candidate>self.maximum then self:paint(characterId);return false end
                self.level=candidate
                self:paint(characterId)
                return true
            end,available)
        end
        bindArrow(previous,'character_ascension_previous',-1)
        bindArrow(nextButton,'character_ascension_next',1)
    end
    return settings
end
return M
