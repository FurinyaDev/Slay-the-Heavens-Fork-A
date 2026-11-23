-- Public competition and editor-only STS1 both use the two-act campaign.
-- Explicit full-source hosts retain the original development fixtures.
local M={}
local editorProfile='sts1-develop'
local restricted={
    ['competition-two-act']={ironclad=true},
    [editorProfile]={ironclad=true,silent=true,defect=true,watcher=true},
}

function M.editorProfile(build,testPlay)
    if testPlay==true and type(build)=='table' and build.workKey==editorProfile then return editorProfile end
end

function M.isTwoAct(profile)
    return restricted[profile]~=nil
end

function M.supportsCampaign(profile)
    return profile=='full-source' or M.isTwoAct(profile)
end

function M.allows(profile,id)
    local roles=restricted[profile]
    return not roles or id==nil or roles[id]==true
end

function M.accepts(data,options)
    local roles=options and restricted[options.campaignProfile]
    if not roles then return true end
    if data.originalV4Rules~=nil then return false end
    local identity
    -- runCardCharacter identifies the catalogue, not an active prepared role.
    for _,field in ipairs({{options,'character'},{data,'experimentalCharacter'},{data,'characterId'},
        {data,'originalV4Role'}})do
        local id=field[1][field[2]]
        if id~=nil then
            if not roles[id] or identity and identity~=id then return false end
            identity=id
        end
    end
    return true
end
return M
