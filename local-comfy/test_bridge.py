import os
import tempfile
import unittest
from unittest.mock import patch

os.environ['BRIDGE_DATA'] = tempfile.mkdtemp(prefix='huobao-bridge-test-')
import bridge

class BridgeTests(unittest.TestCase):
    def test_image_generation_and_edit(self):
        g, output, _ = bridge.image_graph({'prompt':'test','size':'1920x1080'}, [])
        self.assertEqual(g['1']['inputs']['unet_name'], 'qwen_image_2512_bf16.safetensors')
        self.assertLessEqual(g['7']['inputs']['width']*g['7']['inputs']['height'], 1100000)
        edit, _, _ = bridge.image_graph({'prompt':'edit'}, ['ref.png'])
        self.assertEqual(edit['5']['class_type'], 'TextEncodeQwenImageEditPlus')
        self.assertEqual(output, '10')

    def test_video_graph(self):
        r = {'prompt':'move','firstFrameUrl':'data:image/png;base64,AA==','duration':5,'resolution':'720p'}
        g, output, duration = bridge.video_graph(r, 'ref.png')
        self.assertEqual(g['12']['inputs']['width'],1280)
        self.assertEqual(g['12']['inputs']['length'],81)
        self.assertEqual(g['17']['inputs']['format'],'mp4')
        self.assertEqual(g['14']['inputs']['latent_image'],['13',0])
        self.assertEqual(duration,81/16)
        self.assertEqual(output,'17')

    def test_unsupported_parameters(self):
        for extra in [{'generateAudio':True},{'duration':10},{'lastFrameUrl':'x'},{'referenceImageUrls':['a','b']},{'resolution':'1080p'}]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                bridge.validate_video({'firstFrameUrl':'data:image/png;base64,AA==',**extra})

    def test_idempotent_submission(self):
        record={'prompt':'test','requestKey':'unit-test'}
        with patch.object(bridge,'api',return_value={'prompt_id':'mock'}) as api:
            first=bridge.submit('image',record)
            self.assertEqual(first,bridge.submit('image',record))
            self.assertEqual(api.call_count,1)
        with self.assertRaises(ValueError):
            bridge.submit('image',{**record,'prompt':'different'})

    def test_failure_not_resubmitted(self):
        record={'prompt':'test','requestKey':'failure'}
        with patch.object(bridge,'api',side_effect=TimeoutError('ambiguous')) as api:
            first=bridge.submit('image',record)
            self.assertEqual(first,bridge.submit('image',record))
            self.assertEqual(api.call_count,1)
        self.assertEqual(bridge.status(first)['status'],'failed')

    def test_status_and_output_url(self):
        with patch.object(bridge,'api',return_value={'prompt_id':'status-mock'}):
            task=bridge.submit('image',{'prompt':'test','requestKey':'status-test'})
        history={'status-mock':{'status':{'completed':True},'outputs':{'10':{'images':[{'filename':'image 1.png','subfolder':'huobao','type':'output'}]}}}}
        with patch.object(bridge,'api',return_value=history):
            result=bridge.status(task)
        self.assertEqual(result['status'],'completed')
        self.assertIn('filename=image+1.png',result['imageUrl'])

    def test_execution_error_is_terminal(self):
        with patch.object(bridge,'api',return_value={'prompt_id':'error-mock'}):
            task=bridge.submit('image',{'prompt':'test','requestKey':'error-test'})
        history={'error-mock':{'status':{'status_str':'error','messages':[['execution_error',{'exception_message':'out of memory'}]]}}}
        with patch.object(bridge,'api',return_value=history):
            result=bridge.status(task)
        self.assertEqual(result,{'status':'failed','error':'out of memory'})

if __name__=='__main__': unittest.main()
